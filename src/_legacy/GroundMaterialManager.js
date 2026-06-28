import * as THREE from 'three';

export class GroundMaterialManager {
    constructor(options = {}) {
        this.color = options.color ?? 0x071010;

        // MeshBasicMaterialにするので、この2つは保持だけ
        this.roughness = options.roughness ?? 0.95;
        this.metalness = options.metalness ?? 0.0;

        this.emissive = options.emissive ?? 0x000000;
        this.emissiveIntensity = options.emissiveIntensity ?? 0.0;

        this.side = options.side ?? THREE.DoubleSide;

        this.useEdgeLines = options.useEdgeLines ?? true;
        this.edgeColor = options.edgeColor ?? 0x66ffff;
        this.edgeOpacity = options.edgeOpacity ?? 0.62;
        this.edgeRenderOrder = options.edgeRenderOrder ?? 4;
    }

    /**
     * ground メッシュにフラットなサイバー調マテリアルを適用する
     * @param {THREE.Mesh} node
     */
    applyGroundMaterial(node) {
        if (!node || !node.isMesh) return;
        if (node.userData.groundMaterialApplied) return;

        node.userData.groundMaterialApplied = true;

        // ✅ リアルな陰影を出さない
        node.material = new THREE.MeshBasicMaterial({
            color: this.color,
            side: this.side,
            depthWrite: true,
            depthTest: true
        });

        // ✅ 影を受けない・落とさない
        node.castShadow = false;
        node.receiveShadow = false;

        node.renderOrder = 1;

        if (this.useEdgeLines) {
            this.addVisibleEdgeLines(node);
        }
    }

    /**
     * ground に見やすい輪郭線を追加する
     * @param {THREE.Mesh} node
     */
    addVisibleEdgeLines(node) {
        if (!node.geometry) return;
        if (node.userData.groundEdgeApplied) return;

        node.userData.groundEdgeApplied = true;

        const edgeGeometry = new THREE.WireframeGeometry(node.geometry);

        const edgeMaterial = new THREE.LineBasicMaterial({
    color: this.edgeColor,
    transparent: true,
    opacity: this.edgeOpacity,

    blending: THREE.AdditiveBlending,

    // ✅ ここ重要
    depthTest: false,

    // ✅ 必須
    depthWrite: false
});

        const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);

        edgeLines.name = `${node.name || 'ground'}_edge_lines`;
        edgeLines.userData.isWire = true;
        edgeLines.userData.surfaceType = 'groundEdge';

        edgeLines.raycast = () => {};

        edgeLines.renderOrder = this.edgeRenderOrder;

        node.add(edgeLines);
    }
}