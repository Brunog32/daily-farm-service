import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useChecklists = () => {
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Query simplificada para evitar requisito de índice compuesto inicial
        const q = query(collection(db, 'checklists'), orderBy('group', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sortOrder = { 'PRE_SERVICE': 1, 'MATERIALS': 2, 'FIELD_SERVICE': 3 };
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => (sortOrder[a.group] || 99) - (sortOrder[b.group] || 99));
            setChecklists(data);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching checklists:', err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addSection = async (sectionData) => {
        try {
            await addDoc(collection(db, 'checklists'), {
                ...sectionData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error adding section:', err);
            throw err;
        }
    };

    const updateSection = async (id, sectionData) => {
        try {
            const sectionRef = doc(db, 'checklists', id);
            await updateDoc(sectionRef, {
                ...sectionData,
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error updating section:', err);
            throw err;
        }
    };

    const deleteSection = async (id) => {
        try {
            await deleteDoc(doc(db, 'checklists', id));
        } catch (err) {
            console.error('Error deleting section:', err);
            throw err;
        }
    };

    return {
        checklists,
        loading,
        error,
        addSection,
        updateSection,
        deleteSection,
        // Helper to get sections by group
        getSectionsByGroup: (group) => checklists.filter(s => s.group === group)
    };
};
