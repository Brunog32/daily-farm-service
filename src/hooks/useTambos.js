import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useTambos = () => {
    const [tambos, setTambos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'tambos'), orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tambosData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.id && doc.data()
            }));
            setTambos(tambosData);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching tambos:', err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addTambo = async (tamboData) => {
        try {
            await addDoc(collection(db, 'tambos'), {
                ...tamboData,
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error adding tambo:', err);
            throw err;
        }
    };

    const updateTambo = async (id, tamboData) => {
        try {
            const tamboRef = doc(db, 'tambos', id);
            await updateDoc(tamboRef, {
                ...tamboData,
                updatedAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error updating tambo:', err);
            throw err;
        }
    };

    return { tambos, loading, error, addTambo, updateTambo };
};
