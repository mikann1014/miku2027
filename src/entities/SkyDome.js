import * as THREE from 'three';
import { SkyShader } from '../shaders/SkyShader.js';


/**
 * SkyDome
 *
 * ・シーン全体を覆うスカイドーム（背景グラデーション）
 * ・ShaderMaterialで上空〜地平線のグラデーションを制御
 * ・複数フェーズ（時間や演出）を定義し、遷移可能
 */


export class SkyDome {
    constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.material = null;

    this.phases = {
        intro: {
            top: new THREE.Color('#050506'),
            mid: new THREE.Color('#151719'),
            bottom: new THREE.Color('#26282c'),
            horizonGlow: new THREE.Color('#7f8790'),
            exponent: 0.95,
            horizonGlowStrength: 0.04
        },

        noColor: {
            top: new THREE.Color('#020202'),
            mid: new THREE.Color('#101010'),
            bottom: new THREE.Color('#202020'),
            horizonGlow: new THREE.Color('#6b6b6b'),
            exponent: 1.1,
            horizonGlowStrength: 0.025
        },

        sadBlueFlash: {
            top: new THREE.Color('#163a69'),
            mid: new THREE.Color('#4c9bdc'),
            bottom: new THREE.Color('#d6f3ff'),
            horizonGlow: new THREE.Color('#8fdcff'),
            exponent: 0.8,
            horizonGlowStrength: 0.35
        },

        paleLight: {
            top: new THREE.Color('#07101a'),
            mid: new THREE.Color('#1d3448'),
            bottom: new THREE.Color('#b9d8e8'),
            horizonGlow: new THREE.Color('#d8f4ff'),
            exponent: 0.9,
            horizonGlowStrength: 0.16
        },

        midCyber: {
            top: new THREE.Color('#041226'),
            mid: new THREE.Color('#0b2a55'),
            bottom: new THREE.Color('#1d4ed8'),
            horizonGlow: new THREE.Color('#6d28d9'),
            exponent: 0.78,
            horizonGlowStrength: 0.24
        },

        smallMarchWarm: {
            top: new THREE.Color('#06162b'),
            mid: new THREE.Color('#174c78'),
            bottom: new THREE.Color('#a36b42'),
            horizonGlow: new THREE.Color('#ffb36b'),
            exponent: 0.82,
            horizonGlowStrength: 0.32
        },

        quietIndigo: {
            top: new THREE.Color('#02030a'),
            mid: new THREE.Color('#09122a'),
            bottom: new THREE.Color('#22143f'),
            horizonGlow: new THREE.Color('#384a88'),
            exponent: 1.05,
            horizonGlowStrength: 0.09
        },

        softBlue: {
            top: new THREE.Color('#071426'),
            mid: new THREE.Color('#285b83'),
            bottom: new THREE.Color('#82c7e8'),
            horizonGlow: new THREE.Color('#a7e8ff'),
            exponent: 0.88,
            horizonGlowStrength: 0.22
        },

        predawn: {
            top: new THREE.Color('#04061a'),
            mid: new THREE.Color('#25164a'),
            bottom: new THREE.Color('#8b3f35'),
            horizonGlow: new THREE.Color('#ff9b53'),
            exponent: 0.9,
            horizonGlowStrength: 0.38
        },

        voiceEchoSky: {
            top: new THREE.Color('#03091e'),
            mid: new THREE.Color('#142957'),
            bottom: new THREE.Color('#5a4c84'),
            horizonGlow: new THREE.Color('#d89bff'),
            exponent: 0.86,
            horizonGlowStrength: 0.28
        },

        lastMusicDawn: {
            top: new THREE.Color('#05142b'),
            mid: new THREE.Color('#36417c'),
            bottom: new THREE.Color('#de7a42'),
            horizonGlow: new THREE.Color('#ffb86c'),
            exponent: 0.82,
            horizonGlowStrength: 0.46
        },

        endingDawn: {
            top: new THREE.Color('#0a2d48'),
            mid: new THREE.Color('#507c9d'),
            bottom: new THREE.Color('#ff8a45'),
            horizonGlow: new THREE.Color('#ffc06a'),
            exponent: 0.82,
            horizonGlowStrength: 0.62
        },

        goldDawn: {
            top: new THREE.Color('#113f5f'),
            mid: new THREE.Color('#8fb3b1'),
            bottom: new THREE.Color('#ffb14f'),
            horizonGlow: new THREE.Color('#ffd07a'),
            exponent: 0.8,
            horizonGlowStrength: 0.74
        },

        newCivilization: {
            top: new THREE.Color('#2d7892'),
            mid: new THREE.Color('#9bd7d6'),
            bottom: new THREE.Color('#ffc66f'),
            horizonGlow: new THREE.Color('#ffe09b'),
            exponent: 0.76,
            horizonGlowStrength: 0.8
        },

        completeSky: {
            top: new THREE.Color('#4eb6d0'),
            mid: new THREE.Color('#bdecea'),
            bottom: new THREE.Color('#ffbe73'),
            horizonGlow: new THREE.Color('#ffe1a3'),
            exponent: 0.78,
            horizonGlowStrength: 0.82
        },

        midIndigo: {
            top: new THREE.Color('#000814'),
            mid: new THREE.Color('#001a33'),
            bottom: new THREE.Color('#102a44'),
            horizonGlow: new THREE.Color('#1e3a5f'),
            exponent: 1.05,
            horizonGlowStrength: 0.08
        },

        lastChorus: {
            top: new THREE.Color('#006a78'),
            mid: new THREE.Color('#35c2c8'),
            bottom: new THREE.Color('#ff6618'),
            horizonGlow: new THREE.Color('#ffb15c'),
            exponent: 0.74,
            horizonGlowStrength: 0.88
        },

        dawn: {
            top: new THREE.Color('#008aa0'),
            mid: new THREE.Color('#7ddbd2'),
            bottom: new THREE.Color('#ff8533'),
            horizonGlow: new THREE.Color('#ffc06a'),
            exponent: 0.82,
            horizonGlowStrength: 0.72
        }
    };

    this.currentTop = this.phases.intro.top.clone();
    this.currentMid = this.phases.intro.mid.clone();
    this.currentBottom = this.phases.intro.bottom.clone();
    this.currentHorizonGlow = this.phases.intro.horizonGlow.clone();

    this.currentExponent = this.phases.intro.exponent;
    this.currentHorizonGlowStrength = this.phases.intro.horizonGlowStrength;

    this.init();
}

    init() {
        // Camera.far が 5000 なので、それより少し小さくする
        const geometry = new THREE.SphereGeometry(4500, 64, 32);

        this.material = new THREE.ShaderMaterial({
            vertexShader: SkyShader.vertexShader,
            fragmentShader: SkyShader.fragmentShader,
            uniforms: {
                topColor: {
                    value: this.currentTop
                },
                midColor: {
                    value: this.currentMid
                },
                bottomColor: {
                    value: this.currentBottom
                },
                horizonGlowColor: {
                    value: this.currentHorizonGlow
                },

                exponent: {
                    value: this.currentExponent
                },
                horizonGlowStrength: {
                    value: this.currentHorizonGlowStrength
                }
            },
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: false,
            fog: false
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = -1000;

        this.scene.add(this.mesh);

        console.log('[SkyDome] initialized');
    }

    updatePosition(cameraPosition) {
        if (!this.mesh) return;

        this.mesh.position.copy(cameraPosition);
    }

    transitionTo(phaseName, alpha) {
        const target = this.phases[phaseName];

        if (!target || !this.material) return;

        this.currentTop.lerp(target.top, alpha);
        this.currentMid.lerp(target.mid, alpha);
        this.currentBottom.lerp(target.bottom, alpha);
        this.currentHorizonGlow.lerp(target.horizonGlow, alpha);

        this.currentExponent = THREE.MathUtils.lerp(
            this.currentExponent,
            target.exponent,
            alpha
        );

        this.currentHorizonGlowStrength = THREE.MathUtils.lerp(
            this.currentHorizonGlowStrength,
            target.horizonGlowStrength,
            alpha
        );

        this.material.uniforms.topColor.value.copy(this.currentTop);
        this.material.uniforms.midColor.value.copy(this.currentMid);
        this.material.uniforms.bottomColor.value.copy(this.currentBottom);
        this.material.uniforms.horizonGlowColor.value.copy(this.currentHorizonGlow);

        this.material.uniforms.exponent.value = this.currentExponent;
        this.material.uniforms.horizonGlowStrength.value = this.currentHorizonGlowStrength;
    }
}