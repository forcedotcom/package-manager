function createHandler(component, key, path) {
    return e => {
        const el = e.target;
        const value = el.type === 'checkbox' ? el.checked : el.value;
        component.setState({
            [key]: path ? component.state[key].setIn(path, value) : value,
        });
    };
}

module.exports = function createStateHandler(component, key, path) {
    if (path) {
        return createHandler(component, key, path);
    }

    const cache = component.__linkStateHandlers ||
        (component.__linkStateHandlers = {});

    return cache[key] || (cache[key] = createHandler(component, key));
};