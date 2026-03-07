import { collection, addDoc, getDocs, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CHECKLIST_SECTIONS } from '../constants/checklists';

/**
 * Crea o actualiza el usuario administrador por defecto (Octavio Janariz)
 */
export const seedDefaultAdmin = async () => {
    try {
        const username = 'octavio';
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snap = await getDocs(q);

        if (snap.empty) {
            await addDoc(collection(db, 'users'), {
                name: 'Octavio',
                lastName: 'Janariz',
                username: username,
                password: '123456',
                createdAt: new Date().toISOString(),
                role: 'admin'
            });
            console.log('Admin Octavio Janariz creado con username: octavio');
            return true;
        }
        return false;
    } catch (err) {
        console.error('Error seeding admin:', err);
        return false;
    }
};

/**
 * Guarda las constantes actuales en la colección 'masterChecklists' como respaldo inmutable
 */
export const seedMasterChecklists = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'masterChecklists'));
        if (!snapshot.empty) {
            for (const d of snapshot.docs) {
                await deleteDoc(doc(db, 'masterChecklists', d.id));
            }
        }

        const flatSections = [
            ...CHECKLIST_SECTIONS.PRE_SERVICE.map(s => ({ ...s, group: 'PRE_SERVICE' })),
            ...CHECKLIST_SECTIONS.FIELD_SERVICE.map(s => ({ ...s, group: 'FIELD_SERVICE' }))
        ];

        for (const section of flatSections) {
            await setDoc(doc(db, 'masterChecklists', section.id), {
                ...section,
                isMaster: true,
                createdAt: new Date().toISOString()
            });
        }
        console.log('Master Checklists sembrados.');
        return true;
    } catch (err) {
        console.error('Error seeding master:', err);
        return false;
    }
};

/**
 * Restablece los checklists operativos desde los masterChecklists
 */
export const resetChecklistsFromMaster = async () => {
    try {
        // 1. Forzar SIEMPRE resembrar el master para tomar cambios de constants
        await seedMasterChecklists();
        const masterSnap = await getDocs(collection(db, 'masterChecklists'));

        const masterData = masterSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Limpiar los operativos actuales
        const currentSnap = await getDocs(collection(db, 'checklists'));
        for (const d of currentSnap.docs) {
            await deleteDoc(doc(db, 'checklists', d.id));
        }

        // 3. Copiar de master a operativos
        for (const section of masterData) {
            const { isMaster, id, ...cleanData } = section;
            await setDoc(doc(db, 'checklists', id), {
                ...cleanData,
                id: id,
                updatedAt: new Date().toISOString()
            });
        }

        console.log('Checklists operativos restablecidos correctamente.');
        return true;
    } catch (err) {
        console.error('Error resetting checklists:', err);
        return false;
    }
};
