import * as THREE from 'three';
import { SkyDome } from '../entities/SkyDome.js';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;

        this.skyDome = null;
        this.hemiLight = null;
        this.dirLight = null;

        this.currentFogColor = new THREE.Color('#020617');

        // 空グラデーションを見せるため薄め
        this.smogDensity = 0.000002;

        this.currentBeatIntensity = 0.0;
        this.currentPhase = 'intro';
    }

    init() {
        this.skyDome = new SkyDome(this.scene);

        // SkyDomeを背景として使う
        this.scene.background = null;

        // 空が単色に潰れない程度の薄いfog
        this.scene.fog = new THREE.FogExp2(
            this.currentFogColor.getHex(),
            this.smogDensity
        );

        // ✅ 地面にオレンジを乗せないため、ライトは青白系に固定寄り
        this.hemiLight = new THREE.HemisphereLight(
            0x9bdcff,
            0x061426,
            0.35
        );
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xdff7ff, 0.35);
        this.dirLight.position.set(200000, 300000, 100000);

        // ✅ リアルな影をやめる
        this.dirLight.castShadow = false;

        this.scene.add(this.dirLight);

        console.log("[EnvironmentManager] Complete Color Timeline System initialized.");
    }

    update(cameraPosition, currentPhase, lerpSpeed = 0.03) {
        if (!this.skyDome) return;

        this.currentPhase = currentPhase || 'intro';

        this.skyDome.updatePosition(cameraPosition);
        this.skyDome.transitionTo(this.currentPhase, lerpSpeed);

        const horizonColor = this.skyDome.currentBottom;
        const zenithColor = this.skyDome.currentTop;

        // fogは空の地平線色へ寄せるが、濃くしすぎない
        this.currentFogColor.lerp(horizonColor, lerpSpeed);

        if (this.scene.fog) {
            this.scene.fog.color.copy(this.currentFogColor);
        }

        // SkyDomeを潰さない
        this.scene.background = null;

        // ✅ 空色は少しだけライトへ反映。ただしgroundが染まりすぎないよう弱める
        if (this.hemiLight) {
            const coolSky = new THREE.Color('#8fdcff');
            const coolGround = new THREE.Color('#061426');

            this.hemiLight.color.lerp(coolSky, lerpSpeed);
            this.hemiLight.groundColor.lerp(coolGround, lerpSpeed);
        }

        switch (this.currentPhase) {
            case 'intro':
                this.smogDensity = THREE.MathUtils.lerp(
                    this.smogDensity,
                    0.0000025,
                    lerpSpeed
                );

                this.hemiLight.intensity = THREE.MathUtils.lerp(
                    this.hemiLight.intensity,
                    0.28,
                    lerpSpeed
                );

                this.dirLight.intensity = THREE.MathUtils.lerp(
                    this.dirLight.intensity,
                    0.12,
                    lerpSpeed
                );

                this.dirLight.color.setHex(0xbfdfff);
                break;

            case 'midCyber':
                this.smogDensity = THREE.MathUtils.lerp(
                    this.smogDensity,
                    0.000002,
                    lerpSpeed
                );

                this.hemiLight.intensity = THREE.MathUtils.lerp(
                    this.hemiLight.intensity,
                    0.55,
                    lerpSpeed
                );

                this.dirLight.intensity = THREE.MathUtils.lerp(
                    this.dirLight.intensity,
                    0.25,
                    lerpSpeed
                );

                this.dirLight.color.setHex(0xaeeaff);
                break;

            case 'midIndigo':
                this.smogDensity = THREE.MathUtils.lerp(
                    this.smogDensity,
                    0.0000018,
                    lerpSpeed
                );

                this.hemiLight.intensity = THREE.MathUtils.lerp(
                    this.hemiLight.intensity,
                    0.35,
                    lerpSpeed
                );

                this.dirLight.intensity = THREE.MathUtils.lerp(
                    this.dirLight.intensity,
                    0.10,
                    lerpSpeed
                );

                this.dirLight.color.setHex(0x88aaff);
                break;

            case 'noColor':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.0000028,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        0.18,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.06,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xbfc7cf);
    break;

case 'sadBlueFlash':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.0000018,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        0.7,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.35,
        lerpSpeed
    );

    this.dirLight.color.setHex(0x90d7ff);
    break;

case 'paleLight':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.000002,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        0.42,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.16,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xd8f5ff);
    break;

case 'smallMarchWarm':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.0000017,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        0.7,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.34,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xd7f4ff);
    break;

case 'quietIndigo':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.0000022,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        0.24,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.08,
        lerpSpeed
    );

    this.dirLight.color.setHex(0x8ea8ff);
    break;

case 'softBlue':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.0000015,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        0.75,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.28,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xcdf5ff);
    break;

case 'predawn':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.0000012,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        0.78,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.36,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xcff2ff);
    break;

case 'voiceEchoSky':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.000001,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        0.86,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.38,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xd8f7ff);
    break;

case 'lastMusicDawn':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.0000009,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        1.0,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.48,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xe7faff);
    break;

case 'endingDawn':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.0000008,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        1.08,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.56,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xeafaff);
    break;

case 'goldDawn':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.00000065,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        1.16,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.62,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xf2fbff);
    break;

case 'newCivilization':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.00000055,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        1.22,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.68,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xf5fcff);
    break;

case 'completeSky':
    this.smogDensity = THREE.MathUtils.lerp(
        this.smogDensity,
        0.00000045,
        lerpSpeed
    );

    this.hemiLight.intensity = THREE.MathUtils.lerp(
        this.hemiLight.intensity,
        1.25,
        lerpSpeed
    );

    this.dirLight.intensity = THREE.MathUtils.lerp(
        this.dirLight.intensity,
        0.72,
        lerpSpeed
    );

    this.dirLight.color.setHex(0xf8fdff);
    break;
    
            case 'lastChorus':
                this.smogDensity = THREE.MathUtils.lerp(
                    this.smogDensity,
                    0.0000014,
                    lerpSpeed
                );

                this.hemiLight.intensity = THREE.MathUtils.lerp(
                    this.hemiLight.intensity,
                    1.15,
                    lerpSpeed
                );

                // ✅ 強すぎるオレンジ光を避ける
                this.dirLight.intensity = THREE.MathUtils.lerp(
                    this.dirLight.intensity,
                    0.55,
                    lerpSpeed
                );

                this.dirLight.color.setHex(0xc8f4ff);
                break;

            case 'dawn':
                this.smogDensity = THREE.MathUtils.lerp(
                    this.smogDensity,
                    0.0000008,
                    lerpSpeed
                );

                this.hemiLight.intensity = THREE.MathUtils.lerp(
                    this.hemiLight.intensity,
                    1.25,
                    lerpSpeed
                );

                // ✅ 朝焼けでもgroundをオレンジ染めしない
                this.dirLight.intensity = THREE.MathUtils.lerp(
                    this.dirLight.intensity,
                    0.65,
                    lerpSpeed
                );

                this.dirLight.color.setHex(0xd8f7ff);
                this.dirLight.position.set(300000, 80000, 50000);
                break;
        }

        if (this.scene.fog) {
            this.scene.fog.density = this.smogDensity;
        }

        this.currentBeatIntensity = THREE.MathUtils.lerp(
            this.currentBeatIntensity,
            0.0,
            0.08
        );
    }

    updateBeatMetrics(beatProgress, isChorus, position) {
        const p = THREE.MathUtils.clamp(beatProgress, 0, 1);
        const pulse = Math.pow(1.0 - p, 2.5);
        const boost = isChorus ? 0.8 : 0.35;

        this.currentBeatIntensity = pulse * boost;
    }

    boostBlueHorizon() {
        this.currentFogColor.lerp(new THREE.Color('#2244ff'), 0.2);
    }

    clearSmog() {
        this.smogDensity *= 0.6;
    }

    enterSilence() {
        if (this.hemiLight) this.hemiLight.intensity = 0.1;
        if (this.dirLight) this.dirLight.intensity = 0.05;
    }
}