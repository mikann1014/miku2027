import * as THREE from 'three';

export class WireOverlayFactory {
    create(
    geometry,
    color,
    opacity,
    blending = THREE.NormalBlending,
    options = {}
) {
    if (!geometry) return null;

    const wireGeometry =
        new THREE.WireframeGeometry(
            geometry
        );

    const wireMaterial =
        new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
            blending,

            /*
             * wire は深度を書かない。
             */
            depthWrite: false,

            /*
             * 重要:
             * false にすると常に上に来る。
             * 花に隠れてほしいので true。
             */
            depthTest: options.depthTest ?? true,

            depthFunc: THREE.LessEqualDepth
        });

    const wire =
        new THREE.LineSegments(
            wireGeometry,
            wireMaterial
        );

    wire.userData.isWire = true;

    /*
     * wire は地形装飾なので低め。
     */
    wire.renderOrder = options.renderOrder ?? 1;

    wire.frustumCulled = false;

    return wire;
}
}