export class PhaseTimelineManager {
    constructor() {
        this.currentPhase = 'intro';
    }

    update(progress, position, currentWord) {
        const prev = this.currentPhase;

        if (progress < 0.2) this.currentPhase = 'intro';
        else if (progress < 0.4) this.currentPhase = 'midCyber';
        else if (progress < 0.6) this.currentPhase = 'midIndigo';
        else if (progress < 0.85) this.currentPhase = 'lastChorus';
        else this.currentPhase = 'dawn';

        // ✅ フェーズ切り替えイベント
        const phaseChanged = prev !== this.currentPhase;

        return {
            phase: this.currentPhase,
            phaseChanged,
            word: currentWord?.text || null,
            position
        };
    }
}
``