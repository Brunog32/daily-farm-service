import { useState, useEffect } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

const debounceTimers = {};
const pendingUpdates = {}; // Guarda estado intermedio antes de subir

export const useDraftService = () => {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'servicesTemp'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedDrafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDrafts(loadedDrafts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const createServiceDraft = async (tamboId, tamboName, operatorName) => {
        const id = `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newService = {
            id,
            tamboId,
            tamboName,
            operator: operatorName || 'Operador',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft',
            preService: { status: 'PENDING', data: { sections: {} } },
            materials: { status: 'PENDING', data: { sections: {} } },
            execution: { status: 'PENDING', data: { sections: {} } },
        };
        await setDoc(doc(db, 'servicesTemp', id), newService);
        return id; // Retorna la promesa pero en el flow tal vez haya que hacer await al navigate. O navegamos con el ID igual
    };

    const getDraftById = (id) => {
        return drafts.find(d => d.id === id) || null;
    };

    const updateServiceDraft = async (id, updates) => {
        const docRef = doc(db, 'servicesTemp', id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    };

    const updateStageData = (id, stage, dataUpdates, statusUpdate = null, currentDraft) => {
        if (!pendingUpdates[id]) {
            pendingUpdates[id] = {
                updatedAt: new Date().toISOString()
            };
        }

        const stageDataToSave = {
            ...currentDraft[stage],
            ...(pendingUpdates[id][stage] || {}), // Aplicar pendings si hay
            data: {
                ...currentDraft[stage].data,
                ...(pendingUpdates[id][stage]?.data || {}),
                ...dataUpdates,
            }
        };

        if (statusUpdate) {
            stageDataToSave.status = statusUpdate;
        }

        pendingUpdates[id][stage] = stageDataToSave;
        pendingUpdates[id].updatedAt = new Date().toISOString();

        if (debounceTimers[id]) {
            clearTimeout(debounceTimers[id]);
        }

        debounceTimers[id] = setTimeout(async () => {
            try {
                const docRef = doc(db, 'servicesTemp', id);
                const updates = { ...pendingUpdates[id] };
                delete pendingUpdates[id];
                await updateDoc(docRef, updates);
            } catch (error) {
                console.error("Error guardando draft en Firestore", error);
            }
        }, 1500); // 1.5s debounce time para abaratar costos de Firestore
    };

    const deleteDraft = async (id) => {
        if (debounceTimers[id]) {
            clearTimeout(debounceTimers[id]);
            delete debounceTimers[id];
        }
        if (pendingUpdates[id]) {
            delete pendingUpdates[id];
        }
        await deleteDoc(doc(db, 'servicesTemp', id));
    };

    return {
        drafts,
        loading,
        createServiceDraft,
        getDraftById,
        updateServiceDraft,
        updateStageData,
        deleteDraft
    };
};
