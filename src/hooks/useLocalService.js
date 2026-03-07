import { useState, useEffect } from 'react';

const STORAGE_KEY = 'df_local_services';

export const useLocalService = () => {
    const [drafts, setDrafts] = useState([]);

    useEffect(() => {
        loadDrafts();
    }, []);

    const loadDrafts = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setDrafts(JSON.parse(stored));
        }
    };

    const saveDrafts = (newDrafts) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newDrafts));
        setDrafts(newDrafts);
    };

    const createServiceDraft = (tamboId, tamboName, operatorName) => {
        const newService = {
            id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

        const stored = localStorage.getItem(STORAGE_KEY);
        const currentDrafts = stored ? JSON.parse(stored) : [];
        const updatedDrafts = [newService, ...currentDrafts];
        saveDrafts(updatedDrafts);

        return newService.id;
    };

    const getDraftById = (id) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const drafts = JSON.parse(stored);
            return drafts.find(d => d.id === id) || null;
        }
        return null;
    };

    const updateServiceDraft = (id, updates) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            let drafts = JSON.parse(stored);
            const index = drafts.findIndex(d => d.id === id);
            if (index !== -1) {
                drafts[index] = {
                    ...drafts[index],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                saveDrafts(drafts);
            }
        }
    };

    const updateStageData = (id, stage, dataUpdates, statusUpdate = null) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            let drafts = JSON.parse(stored);
            const index = drafts.findIndex(d => d.id === id);
            if (index !== -1) {
                const service = drafts[index];
                service[stage] = {
                    ...service[stage],
                    data: { ...service[stage].data, ...dataUpdates },
                };
                if (statusUpdate) {
                    service[stage].status = statusUpdate;
                }
                service.updatedAt = new Date().toISOString();
                saveDrafts(drafts);
            }
        }
    };

    const deleteDraft = (id) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            let drafts = JSON.parse(stored);
            drafts = drafts.filter(d => d.id !== id);
            saveDrafts(drafts);
        }
    };

    return {
        drafts,
        createServiceDraft,
        getDraftById,
        updateServiceDraft,
        updateStageData,
        deleteDraft,
        refreshDrafts: loadDrafts
    };
};
