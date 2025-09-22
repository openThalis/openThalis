export const createComponentState = (initialState = {}) => {
    let state = { ...initialState };
    
    return {
        getState: () => state,
        setState: (updates) => {
            Object.assign(state, updates);
        }
    };
};

export const sharedState = {
    lastSelectedComponent: 'center',
    usedTabNames: new Set(),
    tabNameCounters: new Map()
};
