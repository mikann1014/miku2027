import * as THREE from 'three';


/**
 * 足跡を連続生成するマーチステップエフェクト
 * ・左右交互の足跡を前方へ配置
 * ・時間差で出現→拡大→フェードアウト
 */

export class MarchStepEffect {
    constructor(scene, options = {}) {
        this.scene = scene;

        this.group = new THREE.Group();
        this.group.name = 'marchStepEffectGroup';

        this.scene.add(this.group);

        this.activeSteps = [];

        this.stepCount = options.stepCount ?? 7;
        this.stepInterval = options.stepInterval ?? 0.68;
        this.sideOffset = options.sideOffset ?? 0.34;

        this.lifeDuration = options.lifeDuration ?? 1.45;
        this.delayPerStep = options.delayPerStep ?? 0.13;

        this.baseOpacity = options.baseOpacity ?? 0.9;

        this.footWidth = options.footWidth ?? 0.62;
        this.footHeight = options.footHeight ?? 1.08;

        this.color = new THREE.Color(
            options.color ?? 0x7ffcff
        );

        this.textureCache = new Map();
    }

    spawn(startPoint, forwardDirection = null, options = {}) {
        if (!this.scene || !startPoint) return;

        const forward = forwardDirection
            ? forwardDirection.clone().setY(0).normalize()
            : new THREE.Vector3(0, 0, -1);

        if (forward.lengthSq() < 0.0001) {
            forward.set(0, 0, -1);
        }

        const right =
            new THREE.Vector3()
                .crossVectors(
                    forward,
                    new THREE.Vector3(0, 1, 0)
                )
                .normalize();

        const color =
            new THREE.Color(
                options.color ?? this.color
            );

        for (let i = 0; i < this.stepCount; i++) {
            const side =
                i % 2 === 0
                    ? -1
                    : 1;

            const position =
                startPoint
                    .clone()
                    .addScaledVector(
                        forward,
                        i * this.stepInterval
                    )
                    .addScaledVector(
                        right,
                        side * this.sideOffset
                    );

            position.y +=
                options.yOffset ?? 0.115;

            const step =
                this.createFootStepMesh(
                    color,
                    options.opacity ?? this.baseOpacity,
                    side
                );

            step.position.copy(position);

            step.rotation.x =
                -Math.PI / 2;

            const baseAngle =
                Math.atan2(
                    forward.x,
                    forward.z
                ) + Math.PI;

            // ✅ 内股ではなく、左右それぞれ外側へ少し開く
            step.rotation.z =
                baseAngle;

            step.scale.setScalar(0.2);

            step.userData.life = 0;
            step.userData.delay = i * this.delayPerStep;
            step.userData.duration =
                options.lifeDuration ?? this.lifeDuration;

            this.group.add(step);
            this.activeSteps.push(step);
        }
    }

    createFootStepMesh(color, opacity, side = 1) {
        const texture =
            this.getOrCreateFootprintTexture(
                color,
                side
            );

        const material =
            new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: true,
                toneMapped: false,
                side: THREE.DoubleSide
            });

        const geometry =
            new THREE.PlaneGeometry(
                this.footWidth,
                this.footHeight
            );

        geometry.scale(
            1,
            -1,
            1
        );

        const mesh =
            new THREE.Mesh(
                geometry,
                material
            );

        mesh.name =
            side < 0
                ? 'march_left_footprint'
                : 'march_right_footprint';

        mesh.userData.effectType = 'marchStep';
        mesh.userData.initialOpacity = opacity;
        mesh.renderOrder = 32;
        mesh.frustumCulled = false;

        mesh.raycast = () => {};

        return mesh;
    }

    getOrCreateFootprintTexture(color, side) {
        const key =
            `${color.getHexString()}_${side < 0 ? 'left' : 'right'}`;

        if (this.textureCache.has(key)) {
            return this.textureCache.get(key);
        }

        const texture =
            this.createFootprintTexture(
                color,
                side
            );

        this.textureCache.set(
            key,
            texture
        );

        return texture;
    }
createFootprintTexture(color, side = 1) {
    const canvas =
        document.createElement('canvas');

    const context =
        canvas.getContext('2d');

    canvas.width = 256;
    canvas.height = 384;

    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const hex =
        `#${color.getHexString()}`;

    context.shadowColor = hex;
    context.shadowBlur = 20;

    context.fillStyle = hex;
    context.globalAlpha = 0.82;

    const centerX =
        canvas.width / 2 +
        side * 8;

    // =========================
    // 足裏
    // =========================
    context.save();

    context.translate(
        centerX,
        214
    );

    context.rotate(
        0
    );

    this.drawSoleShape(
        context
    );

    context.fill();

    context.restore();

    // =========================
    // 土踏まずのくびれを抜く
    // =========================
    context.save();

    context.globalCompositeOperation = 'destination-out';
    context.globalAlpha = 0.42;

    context.translate(
        centerX - side * 30,
        218
    );

    context.rotate(
        0
    );

    context.beginPath();
    context.ellipse(
        0,
        0,
        20,
        70,
        0,
        0,
        Math.PI * 2
    );
    context.fill();

    context.restore();

    // =========================
    // かかとの丸みを少し強調
    // =========================
    context.save();

    context.globalCompositeOperation = 'source-over';
    context.shadowColor = hex;
    context.shadowBlur = 18;
    context.fillStyle = hex;
    context.globalAlpha = 0.68;

    context.beginPath();
    context.ellipse(
        centerX,
        290,
        34,
        46,
        0,
        0,
        Math.PI * 2
    );
    context.fill();

    context.restore();

    // =========================
    // つま先
    // =========================
    context.save();

    context.globalCompositeOperation = 'source-over';
    context.shadowColor = hex;
    context.shadowBlur = 18;
    context.fillStyle = hex;
    context.globalAlpha = 0.9;

    const toeBaseY = 82;

    const toes = [
        {
            x: side * 34,
            y: toeBaseY + 8,
            rx: 12,
            ry: 17
        },
        {
            x: side * 15,
            y: toeBaseY - 5,
            rx: 14,
            ry: 20
        },
        {
            x: side * -5,
            y: toeBaseY - 10,
            rx: 13,
            ry: 18
        },
        {
            x: side * -24,
            y: toeBaseY - 4,
            rx: 11,
            ry: 16
        },
        {
            x: side * -41,
            y: toeBaseY + 10,
            rx: 8,
            ry: 12
        }
    ];

    toes.forEach(toe => {
        context.beginPath();
        context.ellipse(
            centerX + toe.x,
            toe.y,
            toe.rx,
            toe.ry,
            0,
            0,
            Math.PI * 2
        );
        context.fill();
    });

    context.restore();

    // =========================
    // 内側ハイライト
    // =========================
    context.save();

    context.globalCompositeOperation = 'source-over';
    context.shadowBlur = 8;
    context.fillStyle = 'rgba(230, 255, 255, 0.78)';
    context.globalAlpha = 0.24;

    context.beginPath();
    context.ellipse(
        centerX + side * 7,
        210,
        18,
        64,
        0,
        0,
        Math.PI * 2
    );
    context.fill();

    context.restore();

    const texture =
        new THREE.CanvasTexture(canvas);

    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

    drawSoleShape(context) {
    context.beginPath();

    // つま先側
    context.moveTo(-26, -102);

    context.bezierCurveTo(
        -48,
        -88,
        -56,
        -52,
        -50,
        -18
    );

    // 外側のふくらみ
    context.bezierCurveTo(
        -46,
        24,
        -38,
        72,
        -26,
        104
    );

    // かかと
    context.bezierCurveTo(
        -12,
        132,
        18,
        132,
        32,
        104
    );

    // 反対側
    context.bezierCurveTo(
        48,
        70,
        56,
        22,
        50,
        -22
    );

    // 母指球側
    context.bezierCurveTo(
        46,
        -68,
        24,
        -116,
        -6,
        -122
    );

    context.bezierCurveTo(
        -14,
        -122,
        -21,
        -115,
        -26,
        -102
    );

    context.closePath();
}

    update(delta = 0.016) {
        if (this.activeSteps.length === 0) return;

        this.activeSteps =
            this.activeSteps.filter(step => {
                if (!step || !step.material) {
                    return false;
                }

                step.userData.life += delta;

                const life =
                    step.userData.life;

                const delay =
                    step.userData.delay ?? 0;

                const duration =
                    step.userData.duration ?? this.lifeDuration;

                if (life < delay) {
                    step.visible = false;
                    return true;
                }

                step.visible = true;

                const t =
                    THREE.MathUtils.clamp(
                        (life - delay) / duration,
                        0,
                        1
                    );

                const appear =
                    THREE.MathUtils.smoothstep(
                        t,
                        0,
                        0.18
                    );

                const fade =
                    1.0 -
                    THREE.MathUtils.smoothstep(
                        t,
                        0.48,
                        1.0
                    );

                const scale =
                    THREE.MathUtils.lerp(
                        0.2,
                        1.0,
                        appear
                    );

                step.scale.setScalar(scale);

                const initialOpacity =
                    step.userData.initialOpacity ??
                    this.baseOpacity;

                step.material.opacity =
                    initialOpacity * appear * fade;

                step.material.needsUpdate = true;

                if (t >= 1.0) {
                    this.remove(step);
                    return false;
                }

                return true;
            });
    }

    remove(step) {
        if (!step) return;

        step.parent?.remove(step);

        step.geometry?.dispose?.();

        if (step.material) {
            step.material.dispose?.();
        }
    }

    clear() {
        this.activeSteps.forEach(step => {
            this.remove(step);
        });

        this.activeSteps = [];
    }

    dispose() {
        this.clear();

        this.textureCache.forEach(texture => {
            texture.dispose?.();
        });

        this.textureCache.clear();
    }
}