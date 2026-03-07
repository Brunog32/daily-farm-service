import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useServices = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const addService = async (serviceData) => {
        try {
            await addDoc(collection(db, 'services'), {
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
