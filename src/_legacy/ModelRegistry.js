export class ModelRegistry {
    constructor() {
        this.registry = new Map();
    }

    register(name, model) {
        if (!name || !model) return;

        model.visible = false;

        this.registry.set(
            name,
            model
        );

        console.log(`[ModelRegistry] Registered: ${name}`);
    }

    get(id) {
        return this.registry.get(id) || null;
    }

    has(id) {
        return this.registry.has(id);
    }

    clear() {
        this.registry.clear();
    }
}
``