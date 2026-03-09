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
        // No hacer await para evitar que se congele estando offline.
        setDoc(doc(db, 'servicesTemp', id), newService).catch(err => {
            console.error("Error creating draft offline:", err);
        });
        return id;
    };

    const getDraftById = (id) => {
        return drafts.find(d => d.id === id) || null;
    };

    const updateServiceDraft = async (id, updates) => {
        const docRef = doc(db, 'servicesTemp', id);
        updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        }).catch(err => {
            console.error("Error updating draft:", err);
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

        debounceTimers[id] = setTimeout(() => {
            try {
                const docRef = doc(db, 'servicesTemp', id);
                const updates = { ...pendingUpdates[id] };
                delete pendingUpdates[id];
                // No await to avoid blocking offline queues and properly continue
                updateDoc(docRef, updates).catch(err => {
                    console.error("Error guardando draft en Firestore", err);
                });
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
        deleteDoc(doc(db, 'servicesTemp', id)).catch(err => {
            console.error("Error deleting draft:", err);
        });
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
