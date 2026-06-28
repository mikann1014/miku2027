export class TextAliveEffectBridge {
    constructor(environment, spawnManager, clusterManager) {
        this.environment = environment;
        this.spawnManager = spawnManager;
        this.clusterManager = clusterManager;
    }

    handleEvent(event) {
        const word = event.word;

        if (!word) return;

        // ✅ フェーズ1：カナシミ
        if (word.includes('カナシミ')) {
            this.spawnSadnessPulse();
            this.environment.boostBlueHorizon();
        }

        // ✅ フェーズ2：ナミダ
        if (word.includes('ナミダ')) {
            this.spawnGlowBudRain();
        }

        // ✅ フェーズ2：浄化
        if (
            word.includes('コエ') ||
            word.includes('ココロ')
        ) {
            this.environment.clearSmog();
        }

        // ✅ フェーズ3：完全停止
        if (word.includes('言わなかった')) {
            this.triggerSilenceMode();
        }

        // ✅ フェーズ4：爆発
        if (word.includes('オンガク')) {
            this.clusterManager.enableMaxBurst();
        }
    }

    spawnSadnessPulse() {
        console.log('blue particles');
    }

    spawnGlowBudRain() {
        console.log('rain');
    }

    triggerSilenceMode() {
        this.environment.enterSilence();
    }
}