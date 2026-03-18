import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useServices = (type = 'service') => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const collectionName = type === 'urgencia' ? 'urgencias' : 'services';

    useEffect(() => {
        const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [collectionName]);

    const addService = async (serviceData) => {
        try {
            await addDoc(collection(db, collectionName), {
                ...serviceData,
                createdAt: new Date().toISOString()
            });
        } catch (err) {
            console.error('Error adding service:', err);
            throw err;
        }
    };

    return { services, loading, addService };
};
