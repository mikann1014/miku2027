import * as THREE from 'three';

export class PathMaterialManager {
    constructor(options = {}) {
        this.wireColor = options.wireColor ?? 0x00ffff;
        this.wireOpacity = options.wireOpacity ?? 1.0;
    }

    /**
     * path/load メッシュを「面なし + 線だけ発光」に変換する
     * @param {THREE.Mesh} node
     */
    applyWireOnly(node) {
        if (!node || !node.isMesh) return;
        if (node.userData.pathWireApplied) return;

        node.userData.pathWireApplied = true;

        this.applyInvisibleSurfaceMaterial(node);
        this.addWireLines(node);
    }

    /**
     * 元メッシュの面だけを非表示にする
     *
     * 注意:
     * node.visible = false にすると、子要素として追加した wireLines も消える。
     * そのため material.visible = false / colorWrite = false を使って
     * 親メッシュ自体は残しつつ、面だけ描画しない。
     *
     * @param {THREE.Mesh} node
     */
    applyInvisibleSurfaceMaterial(node) {
        node.material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.0,
            visible: false,
            colorWrite: false,
            depthWrite: false,
            depthTest: false,
            side: THREE.DoubleSide
        });
    }

    /**
     * Mesh の wireframe ではなく LineSegments を使って線だけ描画する
     *
     * @param {THREE.Mesh} node
     */
    addWireLines(node) {
        const wireGeometry = new THREE.WireframeGeometry(node.geometry);

        const wireMaterial = new THREE.LineBasicMaterial({
            color: this.wireColor,
            transparent: true,
            opacity: this.wireOpacity,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false
        });

        const wireLines = new THREE.LineSegments(wireGeometry, wireMaterial);

        wireLines.name = `${node.name || 'path'}_wire_only`;
        wireLines.userData.isWire = true;
        wireLines.userData.surfaceType = 'pathWire';

        // 配置判定では使わない
        // PlacementManager 側では landObjects に含まれる元メッシュだけを intersect する想定
        wireLines.raycast = () => {};

        // 親Meshのローカル座標に合わせるため、位置・回転・スケールは触らない
        node.add(wireLines);
    }
}