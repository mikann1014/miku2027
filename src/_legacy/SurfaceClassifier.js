export class SurfaceClassifier {
    /**
     * 地形メッシュの種類を判定する
     * @param {THREE.Mesh} node
     * @returns {'water' | 'path' | 'ground' | 'unknown'}
     */
    classify(node) {
        if (!node || !node.isMesh) {
            return 'unknown';
        }

        const material = Array.isArray(node.material) ? node.material[0] : node.material;

        const materialName = (material?.name || '').toLowerCase();
        const nodeName = (node.name || '').toLowerCase();

        if (
            materialName.includes('lake') ||
            nodeName.includes('lake')
        ) {
            return 'water';
        }

        if (
            materialName.includes('load') ||
            nodeName.includes('load') ||
            materialName.includes('road') ||
            nodeName.includes('road') ||
            materialName.includes('path') ||
            nodeName.includes('path')
        ) {
            return 'path';
        }

        if (
            materialName.includes('ground') ||
            nodeName.includes('ground') ||
            materialName.includes('land') ||
            nodeName.includes('land')
        ) {
            return 'ground';
        }

        return 'unknown';
    }
}