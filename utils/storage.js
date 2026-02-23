const STORAGE_KEY_ASSIGNMENTS = 'assignments';
const STORAGE_KEY_SECTOR_MATERIALS = 'sectorMaterials';

export const saveAssignments = (assignments) => {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
};

export const getAssignments = () => {
    const assignments = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
    return assignments ? JSON.parse(assignments) : [];
};

export const saveSectorMaterials = (materials) => {
    localStorage.setItem(STORAGE_KEY_SECTOR_MATERIALS, JSON.stringify(materials));
};

export const getSectorMaterials = () => {
    const materials = localStorage.getItem(STORAGE_KEY_SECTOR_MATERIALS);
    return materials ? JSON.parse(materials) : [];
};