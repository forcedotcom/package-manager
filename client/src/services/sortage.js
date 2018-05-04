const PREFIX = "__sortage";
const TABS_PREFIX = PREFIX + "__tabs";

export let getSortOrder = (contextKey, defaultField, defaultDirection) => {
    let orderJson = window.localStorage.getItem(PREFIX + contextKey);
    return orderJson ? JSON.parse(orderJson) : {field: defaultField, direction: defaultDirection};
};

export let changeSortOrder = (contextKey, field, desc) => {
    let sortOrder = getSortOrder(contextKey);
    if (desc !== undefined) {
        sortOrder = {field: field, direction: desc};
    } else if (sortOrder.field === field) {
        sortOrder.direction = sortOrder.direction !== 'desc' ? 'desc' : 'asc';
    } else {
        sortOrder = {field: field, direction: 'desc'};
    }

    window.localStorage.setItem(PREFIX + contextKey, JSON.stringify(sortOrder));
    return sortOrder;
};

export let getTabIndex = (contextKey, defIndex = 0) => {
    if (!contextKey)
        return defIndex;
    
    let str = window.localStorage.getItem(TABS_PREFIX + contextKey);
    try {
        return str ? parseInt(str, 10) : defIndex;
    } catch (e) {
        return defIndex;
    }
};

export let setTabIndex = (contextKey, index) => {
    if (contextKey) {
        window.localStorage.setItem(TABS_PREFIX + contextKey, index);
    }
}