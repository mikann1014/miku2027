import * as THREE from 'three';

export class ColorManager {
    constructor() {
        this.colors = {
            flower1: 0xCCFF00,
            flower2: 0x0055FF,
            flower3: 0xFF0055,

            grass1: 0x00A88F,
            grass2: 0x228B22,
            grass3: 0x66FF66,

            leaves: 0x006400,
            general: 0x00E5FF
        };
    }

    getColor(partName, parentId) {
        const name = (partName || '').toLowerCase();
        const pid = (parentId || '').toLowerCase();
        
        if (name.includes('leaf') || name.includes('leaves')) return this.colors.leaves;

        if (name.includes('grass3')) return this.colors.grass3;
        if (name.includes('grass2')) return this.colors.grass2;
        if (name.includes('grass1')) return this.colors.grass1;
        
        if (name.includes('flower1')) return this.colors.flower1;
        if (name.includes('flower2')) return this.colors.flower2;
        if (name.includes('flower3')) return this.colors.flower3;

        if (pid.includes('grass3')) return this.colors.grass3;
        if (pid.includes('grass2')) return this.colors.grass2;
        if (pid.includes('grass1')) return this.colors.grass1;

        if (pid.includes('flower1')) return this.colors.flower1;
        if (pid.includes('flower2')) return this.colors.flower2;
        if (pid.includes('flower3')) return this.colors.flower3;
        
        return this.colors.general;
    }

    getMaterialsForPart(partName, parentId) {
    const color =
        new THREE.Color(
            this.getColor(
                partName,
                parentId
            )
        );

    const faceMaterial =
        new THREE.MeshBasicMaterial({
            color,

            transparent: true,
            opacity: 0.0,
            colorWrite: false,

            depthWrite: false,
            depthTest: true,

            blending: THREE.NormalBlending,
            side: THREE.DoubleSide,
            toneMapped: false
        });

    faceMaterial.userData.isCyberInvisibleFace = true;

    const lineMaterial =
        new THREE.MeshBasicMaterial({
            color,

            wireframe: true,

            transparent: true,
            opacity: 1.0,

            blending: THREE.AdditiveBlending,

            /*
             * 重要:
             * 山・小島・水面で地形に隠れて見えない問題を避ける。
             */
            depthTest: false,
            depthWrite: false,

            side: THREE.DoubleSide,
            toneMapped: false
        });

    lineMaterial.userData.isCyberLineMaterial = true;

    return {
        faceMaterial,
        lineMaterial
    };
}

}