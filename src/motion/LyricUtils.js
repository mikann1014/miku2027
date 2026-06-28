export function normalizeLyricText(text) {
    return String(text || '')
        .replace(/[「」『』]/g, '')
        .replace(/\s/g, '')
        .trim();
}

export function getPhraseProgress(position, phrase) {
    const startTime = phrase?.startTime;
    const endTime = phrase?.endTime;

    if (
        typeof startTime !== 'number' ||
        typeof endTime !== 'number' ||
        endTime <= startTime
    ) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            (position - startTime) / (endTime - startTime),
            1
        )
    );
}

export function combineText(normalizedPhrase, normalizedWord) {
    return `${normalizedPhrase || ''}${normalizedWord || ''}`;
}