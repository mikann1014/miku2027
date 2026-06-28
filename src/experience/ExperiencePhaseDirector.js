export class ExperiencePhaseDirector {
    constructor(worldRenderer, ui) {
        this.worldRenderer = worldRenderer;
        this.ui = ui;

        this.currentChapter = 'opening';

        this.flags = {
            blueKnown: false,
            noteUnlocked: false,

            leafUnlocked: false,
            flowerUnlocked: false,
            worldBuildingUnlocked: false,

            interactionStopped: false,

            birdSequenceStarted: false,
            operationResumed: false,
            finalBloomTriggered: false,

            lyricAttractSeedShown: false,
            lyricAttractStarted: false,
            mikuRevealedFromLyrics: false,

            rebirthWalkStarted: false,
            finalMusicBurstTriggered: false,
            endingNotesAscended: false,

            rebirthRunStarted: false,
            rebirthSingingNotesStarted: false,
            dawnLightStarted: false,
            melodyClimaxStarted: false,

            lateMarchRunToWalkStarted: false,
            lateWalkStopLoopStarted: false,
            lateStandingHereStarted: false,
            lateFuturePoseStarted: false,
            lateFinalReachStarted: false,

            placedFlowerLightPropagationStarted: false,
            voiceEchoNotesStarted: false,

            // =========================
            // Ending sequence
            // =========================
            finalEndingSequenceStarted: false,
            endingTurnBStarted: false,
            finalPerspectiveLocked: false,

            endingTitleShown: false,

            goldDawnStarted: false,
newCivilizationSkyStarted: false,
completeSkyStarted: false,
firstSmallMarchStarted: false,

        };
    }

update(context) {
    if (!context) {
        return;
    }

    const normalizedPhrase =
        context.normalizedPhrase || '';

    const normalizedWord =
        context.normalizedWord || '';

    const combined =
        `${normalizedPhrase}${normalizedWord}`;

    this.handleOpening(combined);
    this.handleBlue(combined);
    this.handleFirstAct(combined);
    this.handleSecondAct(combined);
    this.handleThirdAct(combined);
    this.handleFourthAct(combined);

    this.handleLateActs(
        combined,
        normalizedWord
    );
}


    handleOpening(combined) {
    if (
        this.currentChapter === 'opening' &&
        combined.includes('このソラ')
    ) {
        this.currentChapter = 'monochrome';

        this.worldRenderer.setPlacementEnabled?.(false);
        this.worldRenderer.currentPhase = 'intro';
        this.worldRenderer.setSkyPhase?.('intro', 0.08);

        console.log('[Experience] Opening: monochrome world.');
    }

    if (
        combined.includes('この空には色なんてないよ')
    ) {
        this.worldRenderer.setSkyPhase?.('noColor', 0.08);

        console.log('[Experience] Sky: no color.');
    }
}

    handleBlue(combined) {
        if (
            !this.flags.blueKnown &&
            (
                combined.includes('青、かな') ||
                combined.includes('青かな')
            )
        ) {
            this.flags.blueKnown = true;
            this.flags.noteUnlocked = true;

            this.currentChapter = 'blue';

            this.worldRenderer.triggerBlueWord?.();
            this.worldRenderer.triggerBlueNoteOnly?.();

            this.worldRenderer.triggerSadBlueFlash?.(850);

            console.log('[Experience] Blue known. Note unlocked.');
        }
    }

handleFirstAct(combined) {
    if (
        combined.includes('ヒカリ') &&
        this.currentChapter !== 'firstAct'
    ) {
        this.currentChapter = 'firstAct';

        this.worldRenderer.currentPhase = 'paleLight';
        this.worldRenderer.setSkyPhase?.('paleLight', 0.05);

        console.log('[Experience] First act: light increased.');
    }

    if (
        this.currentChapter === 'firstAct' &&
        (
            combined.includes('乾いた') ||
            combined.includes('ココロ')
        )
    ) {
        this.currentChapter = 'emptyHeart';

        this.worldRenderer.setPlacementEnabled?.(false);
        this.worldRenderer.setSkyPhase?.('intro', 0.04);

        console.log('[Experience] Empty heart: no flowers yet.');
    }
}

    handleSecondAct(combined) {
        if (
    combined.includes('機械の上で踊った') &&
    this.currentChapter !== 'machineDance'
) {
    this.currentChapter = 'machineDance';

    this.worldRenderer.setSkyPhase?.('midCyber', 0.08);

    setTimeout(() => {
        this.worldRenderer.setMikuMoveMode?.('walk');
    }, 900);

    console.log('[Experience] Machine dance: walk-turn-walk.');
}

        if (
            combined.includes('正しく奇怪なステップ') &&
            this.currentChapter !== 'strangeStep'
        ) {
            this.currentChapter = 'strangeStep';

            this.worldRenderer.setMikuMoveMode?.('walk');

            console.log('[Experience] Strange step: keep walk.');
        }

        if (
    !this.flags.leafUnlocked &&
    combined.includes('データスモッグ')
) {
    this.flags.leafUnlocked = true;
    this.currentChapter = 'dataSmog';

    this.worldRenderer.currentPhase = 'midCyber';
    this.worldRenderer.setSkyPhase?.('midCyber', 0.08);
    this.worldRenderer.triggerDataSmog?.();

    console.log('[Experience] Leaf unlocked.');
}

    }

    handleThirdAct(combined) {
        if (
            !this.flags.flowerUnlocked &&
            (
                combined.includes('あなたを思って') ||
                combined.includes('思ってみたり')
            )
        ) {
            this.flags.flowerUnlocked = true;
            this.currentChapter = 'flowerUnlocked';

            this.worldRenderer.setMikuMoveMode?.('hart');
            this.worldRenderer.setPlacementEnabled?.(true);
            this.ui?.showItemMenu?.();

            console.log('[Experience] Flower placement unlocked.');
        }

        if (
    !this.flags.firstSmallMarchStarted &&
    !this.flags.rebirthRunStarted &&
    combined.includes('小さなマーチ')
) {
    this.flags.firstSmallMarchStarted = true;
    this.flags.worldBuildingUnlocked = true;

    this.currentChapter = 'worldBuilding';

    this.worldRenderer.setPlacementEnabled?.(true);
    this.ui?.showItemMenu?.();

    // 1回目の小さなマーチは walk
    this.worldRenderer.setMikuMoveMode?.('walk');

    this.worldRenderer.setSkyPhase?.(
        'smallMarchWarm',
        0.04
    );

    console.log(
        '[Experience] First small march: walk world building.'
    );
}
    }

    handleFourthAct(combined) {
        if (
            combined.includes('ナミダ') &&
            combined.includes('カタチ')
        ) {
            this.currentChapter = 'tearShape';
            this.worldRenderer.currentPhase = 'midIndigo';

            console.log('[Experience] Tear shape: darker world.');
        }

        if (
            combined.includes('あなたはどんなカタチ')
        ) {
            this.currentChapter = 'questionShape';

            console.log('[Experience] Question shape. No motion change.');
        }

        if (
    !this.flags.interactionStopped &&
    combined.includes('何も言わなかった')
) {
    this.flags.interactionStopped = true;
    this.currentChapter = 'collapse';

    this.worldRenderer.setPlacementEnabled?.(false);
    this.worldRenderer.setInteractionLocked?.(true);

    this.worldRenderer.setSkyPhase?.('quietIndigo', 0.045);

    console.log(
        '[Experience] Interaction stopped. Waiting for Miku collapse motion.'
    );
}
    }

    handleLateActs(combined, normalizedWord = '') {
        if (
    !this.flags.lyricAttractSeedShown &&
    (
        combined.includes('カナシミも') ||
        combined.includes('クルシミも') ||
        combined.includes('キズも') ||
        combined.includes('イラダチも') ||
        combined.includes('サミシサも')
    )
) {
    this.flags.lyricAttractSeedShown = true;
    this.currentChapter = 'rebirthSeedWords';

    this.worldRenderer.setSkyPhase?.('softBlue', 0.045);

    console.log(
        '[Experience] Rebirth seed words will appear separately and drift.'
    );
}

        if (
            !this.flags.lyricAttractStarted &&
            (
                combined.includes('悲しみから寂しさが終わり') ||
                combined.includes('あなたの全てを受け止められたのは')
            )
        ) {
            this.flags.lyricAttractStarted = true;
            this.currentChapter = 'lyricsGathering';

            this.worldRenderer.startLyricAttractForRebirth?.();

            console.log(
                '[Experience] Rebirth gather starts while normal lyrics continue.'
            );
        }

      if (
    !this.flags.mikuRevealedFromLyrics &&
    (
        combined.includes('この空っぽなココロでした') ||
        combined.includes('空っぽなココロでした')
    )
) {
    this.flags.mikuRevealedFromLyrics = true;
    this.flags.operationResumed = true;

    this.currentChapter = 'rebirth';

    this.worldRenderer.revealMikuFromAttractedLyrics?.();

    console.log(
        '[Experience] Miku revealed immediately at empty heart phrase.'
    );
}

        if (
            !this.flags.operationResumed &&
            !this.flags.mikuRevealedFromLyrics &&
            combined.includes('空っぽなココロ') &&
            !combined.includes('空っぽなココロでした')
        ) {
            this.flags.operationResumed = true;

            this.currentChapter = 'rebirth';

            this.worldRenderer.currentPhase = 'lastChorus';

            console.log(
                '[Experience] Rebirth begins. Waiting for lyric reveal if applicable.'
            );
        }

        if (
            this.flags.operationResumed &&
            !this.flags.rebirthRunStarted &&
            (
                combined.includes('私はヒカリの中で歌った') ||
                combined.includes('ヒカリの中で歌った')
            )
        ) {
            this.flags.rebirthRunStarted = true;
            this.flags.rebirthWalkStarted = true;
            this.flags.interactionStopped = false;

            this.currentChapter = 'rebirthRun';

            this.worldRenderer.setInteractionLocked?.(false);
            this.worldRenderer.setPlacementEnabled?.(true);

            this.ui?.showItemMenu?.();

            this.worldRenderer.currentPhase = 'lastChorus';
            this.worldRenderer.environmentLerpSpeed = 0.08;

            this.worldRenderer.setMikuMoveMode?.('run');

            this.worldRenderer.triggerRebirthBlueNotes?.();

            console.log(
                '[Experience] Rebirth run started. Two notes follow behind Miku.'
            );
        }

        if (
            this.flags.rebirthRunStarted &&
            !this.flags.rebirthSingingNotesStarted &&
            (
                combined.includes('潤んだコトバであなたを歌った') ||
                combined.includes('あなたを歌った')
            )
        ) {
            this.flags.rebirthSingingNotesStarted = true;

            const blueNoteManager =
                this.worldRenderer.blueNoteManager;

            if (blueNoteManager) {
                blueNoteManager.bounceHeight = 0.42;
                blueNoteManager.bounceSpeed = 4.1;
                blueNoteManager.spinSpeed = 2.25;
            }

            this.worldRenderer.setMikuMoveMode?.('run');

            console.log(
                '[Experience] Singing note motion started.'
            );
        }

        if (
            this.flags.rebirthRunStarted &&
            !this.flags.dawnLightStarted &&
            (
                combined.includes('増えてゆくデータスモッグの隙間から') ||
                combined.includes('データスモッグの隙間から')
            )
        ) {
            this.flags.dawnLightStarted = true;
            this.currentChapter = 'dawnLight';

            this.worldRenderer.currentPhase = 'dawn';
            this.worldRenderer.environmentLerpSpeed = 0.11;

            this.worldRenderer.triggerDataSmog?.();

            this.worldRenderer.setMikuMoveMode?.('run');

            console.log(
                '[Experience] Late dawn light started. Miku keeps running.'
            );
        }

        if (
            !this.flags.melodyClimaxStarted &&
            (
                combined.includes('あなたのカタチに降り注ぐメロディ') ||
                combined.includes('降り注ぐメロディ')
            )
        ) {
            this.flags.melodyClimaxStarted = true;
            this.currentChapter = 'melodyClimax';

            const mikuModel =
                this.worldRenderer.miku?.model;

            if (
                this.worldRenderer.blueNoteManager &&
                typeof this.worldRenderer.blueNoteManager.enterOrbitMode === 'function' &&
                mikuModel
            ) {
                this.worldRenderer.blueNoteManager.enterOrbitMode(
                    mikuModel
                );
            }

            if (
                this.worldRenderer.noteTrailEffect &&
                typeof this.worldRenderer.noteTrailEffect.start === 'function'
            ) {
                const sources =
                    this.worldRenderer.blueNoteManager
                        ?.getInteractiveObjects?.() || [];

                this.worldRenderer.noteTrailEffect.start(
                    sources
                );
            }

            
this.worldRenderer.triggerMelodyMountainBloom?.({
    count: 360,
    pointSize: 1.65,
    opacity: 0.96
});


            const placedObjects =
                this.worldRenderer.placementManager
                    ?.getPlacedObjects?.() || [];

            this.worldRenderer.worldResonanceEffect?.start?.(
    placedObjects.slice(0, 24),
    {
        duration: 3.0,
        maxSway: 0.08,
        scaleBoost: 0.08,
        colorBoost: 0.5
    }
);

            console.log(
                '[Experience] Melody climax started. Notes orbit moving Miku, trails begin, far mountain bloom requested.'
            );
        }

        if (
    this.flags.rebirthRunStarted &&
    !this.flags.lateMarchRunToWalkStarted &&
    combined.includes('それはあなたと二人で踏み出した小さなマーチ')
) {
    this.flags.lateMarchRunToWalkStarted = true;

    // 2回目は late 用。走行・軌道演出側へ任せる
    this.worldRenderer.playLateMarchRunToWalk?.();

    // 2回目は夜明け前の空に寄せる
    this.worldRenderer.setSkyPhase?.(
        'predawn',
        0.035
    );

    console.log(
        '[Experience] Late small march: keep running / predawn.'
    );
}


        if (
            this.flags.rebirthRunStarted &&
            !this.flags.lateWalkStopLoopStarted &&
            combined.includes('ちょっと進んで止まってを繰り返して')
        ) {
            this.flags.lateWalkStopLoopStarted = true;

            this.worldRenderer.playLateWalkStopLoop?.();

            console.log(
                '[Experience] Late run-stop loop.'
            );
        }

        if (
            this.flags.rebirthRunStarted &&
            !this.flags.lateStandingHereStarted &&
            combined.includes('この場所に立っている')
        ) {
            this.flags.lateStandingHereStarted = true;

            this.worldRenderer.stopMikuAtCurrentPlace?.();

            console.log(
                '[Experience] Miku stands still at this place.'
            );
        }

        if (
    this.flags.rebirthRunStarted &&
    !this.flags.lateFuturePoseStarted &&
    (
        combined.includes('これは私のミライ') ||
        combined.includes('あなたのミライを創ったコエ') ||
        combined.includes('ミライを創ったコエ')
    )
) {
    this.flags.lateFuturePoseStarted = true;

    this.worldRenderer.playMikuFuturePose?.();
    this.worldRenderer.lockCameraBehindMikuForEnding?.();

    this.worldRenderer.setSkyPhase?.('predawn', 0.035);

    console.log(
        '[Experience] This is my future. Camera locked and returning behind Miku.'
    );
}

        if (
    this.flags.rebirthRunStarted &&
    !this.flags.voiceEchoNotesStarted &&
    (
        combined.includes('この先もずっとコエは木霊して') ||
        combined.includes('コエは木霊して') ||
        combined.includes('木霊して')
    )
) {
    this.flags.voiceEchoNotesStarted = true;

    this.worldRenderer.triggerVoiceEchoNotes?.();
    this.worldRenderer.setSkyPhase?.('voiceEchoSky', 0.035);

    console.log(
        '[Experience] Voice echo notes.'
    );
}

        // =========================
        // Final ending sequence
        // ここから最終エンディングへ入る
        // =========================
        if (
    !this.flags.finalEndingSequenceStarted &&
    (
        combined.includes('君は光の中で歌った') ||
        combined.includes('このセカイで最後のオンガクになるから') ||
        combined.includes('最後のオンガクになるから')
    )
) {
    this.flags.finalEndingSequenceStarted = true;
    this.flags.lateFinalReachStarted = true;

    this.worldRenderer.setSkyPhase?.('lastMusicDawn', 0.03);
    this.worldRenderer.startFinalEndingSequenceFromPhrase?.();

    console.log(
        '[Experience] Final ending sequence started.'
    );
}

if (
    this.flags.finalEndingSequenceStarted &&
    (
        combined.includes('君は光の中で歌った') ||
        combined.includes('数多の思いを背負って歌った')
    )
) {
    this.worldRenderer.setSkyPhase?.(
        'endingDawn',
        0.025
    );

    console.log(
        '[Experience] Ending dawn sky.'
    );
}
        

        // =========================
        // Ending TurnB
        // 「数多の思いを背負って歌った」付近でミクがこちらを向く
        // =========================
        // =========================
// Ending TurnB
// 「世界は終わりに向かっていくけれど」付近で
// ミクがこちらを向く
// =========================
if (
    !this.flags.endingTurnBStarted &&
    (
        combined.includes('世界は終わりに向かっていくけれど') ||
        combined.includes('世界は終わりに向かっていく') ||
        combined.includes('終わりに向かっていくけれど') ||
        combined.includes('終わりに向かっていく')
    )
) {
    this.flags.endingTurnBStarted = true;

    this.worldRenderer.setSkyPhase?.('endingDawn', 0.025);
    this.worldRenderer.playEndingMikuTurnB?.();

    console.log(
        '[Experience] Ending TurnB: Miku turns toward camera at world-ending phrase.'
    );
}

       if (
    !this.flags.finalBloomTriggered &&
    combined.includes('僕らが描いた未来')
) {
    this.flags.finalBloomTriggered = true;
    this.currentChapter = 'finalBloom';

    this.worldRenderer.setSkyPhase?.('endingDawn', 0.025);

    this.worldRenderer.placementManager?.bloomAllPlacedObjects?.();

    console.log('[Experience] Final bloom.');
}

if (
    !this.flags.goldDawnStarted &&
    combined.includes('またいつか何万年が経って')
) {
    this.flags.goldDawnStarted = true;

    this.worldRenderer.setSkyPhase?.('goldDawn', 0.025);

    console.log(
        '[Experience] Golden dawn started.'
    );
}

if (
    !this.flags.newCivilizationSkyStarted &&
    combined.includes('新しい文明が生まれたら')
) {
    this.flags.newCivilizationSkyStarted = true;

    this.worldRenderer.setSkyPhase?.('newCivilization', 0.025);

    console.log(
        '[Experience] New civilization dawn started.'
    );
}
// 旧 ending note ascend は、最終エンディング中は発火させない
if (
    !this.flags.completeSkyStarted &&
    (
        combined.includes('きっと私のコエが鳴る') ||
        combined.includes('私のコエが鳴る')
    )
) {
    this.flags.completeSkyStarted = true;

    this.worldRenderer.setSkyPhase?.('completeSky', 0.025);

    if (
        this.flags.finalEndingSequenceStarted &&
        !this.flags.finalPerspectiveLocked
    ) {
        this.flags.finalPerspectiveLocked = true;

        this.worldRenderer.controls?.startFinalSkyAdvance?.({
            duration: 12.5,
            forwardDistance: 95,
            riseForwardDistance: 70,
            upAmount: 52
        });

        console.log(
            '[Experience] Final sky advance started at きっと私のコエが鳴る.'
        );
    }

    console.log(
        '[Experience] Complete sky started.'
    );
}

// =========================
// Ending title
// 「あなたが託したコエが鳴る」でタイトル表示
// =========================
if (
    this.flags.finalEndingSequenceStarted &&
    !this.flags.endingTitleShown &&
    (
        combined.includes('あなたが託したコエが鳴る') ||
        combined.includes('託したコエが鳴る')
    )
) {
    this.flags.endingTitleShown = true;

    this.worldRenderer.showEndingTitle?.();

    console.log(
        '[Experience] Ending title shown at あなたが託したコエが鳴る.'
    );
}
    }

    canInteractWithWater() {
        return !this.flags.interactionStopped;
    }

    canInteractWithPath() {
        return !this.flags.interactionStopped;
    }

    canClickBlueNote() {
        return (
            this.flags.noteUnlocked &&
            !this.flags.interactionStopped
        );
    }

    canPlaceLeaf() {
        return (
            this.flags.leafUnlocked &&
            !this.flags.interactionStopped
        );
    }

    canPlaceFlowers() {
        return (
            this.flags.flowerUnlocked &&
            !this.flags.interactionStopped
        );
    }

    canPlaceAnything() {
        return (
            this.flags.worldBuildingUnlocked &&
            !this.flags.interactionStopped
        );
    }


}