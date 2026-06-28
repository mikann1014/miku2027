import * as THREE from 'three';

/**
 * MikuAnimationController
 * Three.jsのAnimationMixerを使用してモデルのアニメーションを管理するクラス
 */
export class MikuAnimationController {
    constructor(model) {
        this.model = model;

        // AnimationMixerの生成
        this.mixer = new THREE.AnimationMixer(this.model);

        // 登録されているアニメーションアクション
        this.actions = {};

        // 現在再生中のアクション
        this.currentAction = null;
    }

    /**
     * ベースGLBの最初のアニメーションをデフォルトとして設定する
     */
    setupBaseAnimation(gltf, defaultActionName = 'Walk') {
        if (!gltf || !gltf.animations || gltf.animations.length === 0) {
            console.warn('[MikuAnimationController] No animations found in base GLB.');
            return;
        }

        // 読み込まれたアニメーション情報をログ出力
        console.log(
            '[MikuAnimationController] Base GLB animations:',
            gltf.animations.map(clip => ({
                name: clip.name,
                duration: clip.duration,
                tracks: clip.tracks.length
            }))
        );

        // 最初のアニメーションクリップを使用
        const clip = gltf.animations[0].clone();
        clip.name = defaultActionName;

        const action = this.mixer.clipAction(clip);

        // ループ再生設定
        action.enabled = true;
        action.clampWhenFinished = false;
        action.setLoop(THREE.LoopRepeat);

        this.actions[defaultActionName] = action;

        // 即時再生
        this.fadeToAction(defaultActionName, 0.0);
    }

    /**
     * 外部GLTFからアニメーションを追加する
     */
    addAnimationFromGLTF(gltf, actionName) {
        if (!gltf || !gltf.animations || gltf.animations.length === 0) {
            console.warn(`[MikuAnimationController] No animation found for ${actionName}.`);
            return;
        }

        // 読み込まれたアニメーション情報をログ出力
        console.log(
            `[MikuAnimationController] Extra GLB animations for ${actionName}:`,
            gltf.animations.map(clip => ({
                name: clip.name,
                duration: clip.duration,
                tracks: clip.tracks.length
            }))
        );

        let clip = gltf.animations[0].clone();
        clip.name = actionName;

        // Turn系アニメーションの場合はpositionトラックを除去
        if (actionName === 'Turn' || actionName === 'TurnB') {
            clip = this.createTurnClipWithoutAnyPosition(clip);
        }

        const action = this.mixer.clipAction(clip);

        action.stop();
        action.enabled = true;
        action.clampWhenFinished = false;

        this.actions[actionName] = action;

        console.log('[MikuAnimationController] Added animation:', {
            name: clip.name,
            duration: clip.duration,
            tracks: clip.tracks.length
        });
    }

    /**
     * positionトラックを除去したクリップを作成する
     */
    createTurnClipWithoutAnyPosition(clip) {
        const originalTrackCount = clip.tracks.length;

        const filteredTracks = clip.tracks.filter(track => {
            const trackName = track.name.toLowerCase();

            const isPositionTrack =
                trackName.endsWith('.position') ||
                trackName.includes('.position');

            if (isPositionTrack) {
                console.log(
                    '[MikuAnimationController] Removed Turn position track:',
                    track.name
                );
                return false;
            }

            return true;
        });

        const nextClip = clip.clone();
        nextClip.tracks = filteredTracks;

        console.log('[MikuAnimationController] Turn position tracks removed:', {
            before: originalTrackCount,
            after: filteredTracks.length,
            removed: originalTrackCount - filteredTracks.length
        });

        return nextClip;
    }

    hasAction(name) {
        return !!this.actions?.[name];
    }

    findActionName(candidates) {
        for (const name of candidates) {
            if (this.actions[name]) {
                return name;
            }
        }
        return null;
    }

    getActionNames() {
        return Object.keys(this.actions || {});
    }

    /**
     * 指定アクションへフェード遷移（ループ）
     */
    fadeToAction(name, duration = 0.5) {
        if (!this.actions || !this.actions[name]) {
            console.warn(
                `[MikuAnimationController] Action not found: ${name}`,
                this.getActionNames()
            );
            return;
        }

        const previousAction = this.currentAction;
        const nextAction = this.actions[name];

        // 同一アクションの場合は何もしない
        if (previousAction === nextAction) {
            return;
        }

        if (previousAction) {
            previousAction.fadeOut(duration);
        }

        nextAction.enabled = true;
        nextAction.paused = false;
        nextAction.clampWhenFinished = false;
        nextAction.setLoop(THREE.LoopRepeat);

        nextAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();

        this.currentAction = nextAction;

        console.log(`[MikuAnimationController] fadeToAction: ${name}`);
    }

    /**
     * 指定アクションを一度だけ再生する
     */
    playOnce(name, duration = 0.2, onFinished = null) {
        if (!this.actions || !this.actions[name]) {
            console.warn(
                `[MikuAnimationController] One-shot action not found: ${name}`,
                this.getActionNames()
            );
            return;
        }

        const previousAction = this.currentAction;
        const nextAction = this.actions[name];

        if (previousAction && previousAction !== nextAction) {
            previousAction.fadeOut(duration);
        }

        nextAction.enabled = true;
        nextAction.paused = false;
        nextAction.clampWhenFinished = true;
        nextAction.setLoop(THREE.LoopOnce, 1);

        nextAction
            .reset()
            .setEffectiveTimeScale(1)
            .setEffectiveWeight(1)
            .fadeIn(duration)
            .play();

        this.currentAction = nextAction;

        // 再生終了時のコールバック設定
        if (onFinished) {
            const handleFinished = event => {
                if (event.action !== nextAction) {
                    return;
                }

                this.mixer.removeEventListener('finished', handleFinished);
                onFinished();
            };

            this.mixer.addEventListener('finished', handleFinished);
        }

        console.log(`[MikuAnimationController] playOnce: ${name}`);
    }

    // =========================
    // アニメーション呼び出しラッパー
    // =========================

    playWalk(duration = 0.35) {
        this.fadeToAction('Walk', duration);
    }

    playRun(duration = 0.45) {
        this.fadeToAction('Run', duration);
    }

    playWalkToStop(duration = 0.25, onFinished = null) {
        this.playOnce('WalkToStop', duration, onFinished);
    }

    playWalkToStopA(duration = 0.25, onFinished = null) {
        if (this.hasAction('WalkToStopA')) {
            this.playOnce('WalkToStopA', duration, onFinished);
            return;
        }

        this.playWalkToStop(duration, onFinished);
    }

    playWalkToStopB(duration = 0.25, onFinished = null) {
        if (this.hasAction('WalkToStopB')) {
            this.playOnce('WalkToStopB', duration, onFinished);
            return;
        }

        this.playWalkToStop(duration, onFinished);
    }

    playStop(duration = 0.2) {
        if (this.hasAction('Stop')) {
            this.fadeToAction('Stop', duration);
            return;
        }

        this.fadeToAction('Walk', duration);
    }

    playHand(duration = 0.18, onFinished = null) {
        if (this.hasAction('Hand')) {
            this.playOnce('Hand', duration, onFinished);
            return;
        }

        this.playStop(duration);

        if (onFinished) {
            setTimeout(onFinished, 900);
        }
    }

    playHart(duration = 0.18, onFinished = null) {
        if (this.hasAction('Hart')) {
            this.playOnce('Hart', duration, onFinished);
            return;
        }

        this.playStop(duration);

        if (onFinished) {
            setTimeout(onFinished, 900);
        }
    }

    playTurn(duration = 0.16, onFinished = null) {
        if (this.hasAction('Turn')) {
            this.playOnce('Turn', duration, onFinished);
            return;
        }

        console.warn('[MikuAnimationController] Turn not found. Returning to Walk.');

        this.playWalk(duration);

        if (onFinished) {
            setTimeout(onFinished, 500);
        }
    }

    playTurnB(duration = 0.18, onFinished = null) {
        const actionName = this.findActionName([
            'TurnB',
            'MikuTurnB',
            'turnB',
            'Turn_B'
        ]);

        if (!actionName) {
            console.warn('[MikuAnimationController] TurnB action not found.');
            return;
        }

        this.playOnce(actionName, duration, onFinished);
    }

    playReach(duration = 0.2, onFinished = null) {
        this.playHand(duration, onFinished);
    }

    playThink(duration = 0.2, onFinished = null) {
        this.playHart(duration, onFinished);
    }

    playStopToCollapse(duration = 0.12, onFinished = null) {
        if (this.hasAction('StoptoCollapse')) {
            this.playOnce('StoptoCollapse', duration, onFinished);
            return;
        }

        console.warn(
            '[MikuAnimationController] StoptoCollapse not found. Falling back to Stop.'
        );

        this.playStop(duration);

        if (onFinished) {
            setTimeout(onFinished, 1200);
        }
    }

    /**
     * 毎フレーム更新処理
     */
    update(delta) {
        if (!this.mixer) {
            return;
        }

        this.mixer.update(Math.min(delta, 0.1));
    }
}