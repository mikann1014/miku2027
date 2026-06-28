import { normalizeLyricText } from './LyricUtils.js';
import { VisualMotionController } from './VisualMotionController.js';
import { InteractionMotionController } from './InteractionMotionController.js';
import { MikuMotionController } from './MikuMotionController.js';
import { MotionTimelineSynchronizer } from './MotionTimelineSynchronizer.js';

export class MotionDirector {
    constructor(worldRenderer, ui) {
        this.worldRenderer = worldRenderer;
        this.ui = ui;

        this.visualMotion = new VisualMotionController(
            this.worldRenderer
        );

        this.interactionMotion = new InteractionMotionController(
            this.worldRenderer,
            this.ui
        );

        this.mikuMotion = new MikuMotionController(
            this.worldRenderer
        );

        this.timelineSynchronizer =
            new MotionTimelineSynchronizer(
                this.worldRenderer,
                this.ui
            );
    }

    update(position, phrase, currentWord) {
        const phraseText = phrase?.text || '';
        const wordText = currentWord?.text || '';

        const normalizedPhrase = normalizeLyricText(
            phraseText
        );

        const normalizedWord = normalizeLyricText(
            wordText
        );

        const context = {
            position,
            phrase,
            currentWord,
            phraseText,
            wordText,
            normalizedPhrase,
            normalizedWord
        };

        this.visualMotion.update(context);
        this.interactionMotion.update(context);
        this.mikuMotion.update(context);
    }

    syncToPosition({
        position,
        progress,
        player,
        currentWord = null
    }) {
        if (!this.timelineSynchronizer) return;

        const snapshot =
            this.timelineSynchronizer.sync({
                position,
                progress,
                player,
                currentWord
            });

        this.applySnapshotToControllers(snapshot);
    }

    applySnapshotToControllers(snapshot) {
        if (!snapshot) return;

        if (this.visualMotion) {
            this.visualMotion.blueWordTriggered =
                !!snapshot.blueWordTriggered;

            this.visualMotion.kanaVanishTriggered =
                !!snapshot.kanaVanishTriggered;

            this.visualMotion.violinSmogTriggered =
                !!snapshot.violinSmogTriggered;

            this.visualMotion.hikariNoteTriggered =
                !!snapshot.hikariNoteTriggered;
        }

        if (this.interactionMotion) {
            this.interactionMotion.walkToStopATriggered =
                !!snapshot.walkToStopATriggered;

            this.interactionMotion.handTriggered =
                !!snapshot.handTriggered;

            this.interactionMotion.hartTriggered =
                !!snapshot.hartTriggered;

            this.interactionMotion.placementUnlocked =
                !!snapshot.placementUnlocked;

            this.interactionMotion.walkRestartTriggered =
                !!snapshot.walkRestartTriggered;
        }

        if (this.mikuMotion) {
            this.mikuMotion.runTriggered =
                !!snapshot.runTriggered;

            this.mikuMotion.walkBackTriggered =
                !!snapshot.walkBackTriggered;

            this.mikuMotion.walkToStopTriggered =
                !!snapshot.walkToStopTriggered;

            this.mikuMotion.collapsePrepTriggered =
                !!snapshot.collapsePrepTriggered;

            this.mikuMotion.collapseTriggered =
                !!snapshot.collapseTriggered;
        }
    }
}