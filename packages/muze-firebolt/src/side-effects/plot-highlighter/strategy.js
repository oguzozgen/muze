import { intersect, difference } from 'muze-utils';
import { getFormattedSet } from './helper';
import { BEHAVIOURS } from '../..';

const fadeFn = (set, context) => {
    const { formattedSet } = set;
    const {
        mergedEnter,
        mergedExit,
        exitSet,
        completeSet
    } = formattedSet;

    if (!mergedEnter.length && !mergedExit.length) {
        context.applyInteractionStyle(completeSet, { interactionType: 'fade', apply: false });
    } else {
        const layers = context.firebolt.context.layers();

        layers.forEach((layer) => {
            const layerName = layer.constructor.formalName();

            // Apply style only on the hovered layer
            if (layerName === 'area') {
                context.applyInteractionStyle(mergedEnter, { interactionType: 'fade', apply: true }, [layer]);
                context.applyInteractionStyle(exitSet, { interactionType: 'fade', apply: false }, [layer]);
            } else {
                context.applyInteractionStyle(exitSet, { interactionType: 'fade', apply: true }, [layer]);
                context.applyInteractionStyle(mergedEnter, { interactionType: 'fade', apply: false }, [layer]);
            }
        });
    }
};

const fadeOnBrushFn = (set, context, payload) => {
    const { formattedSet } = set;
    const {
        mergedEnter,
        mergedExit,
        completeSet
    } = formattedSet;

    const { dragEnd } = payload;
    let interactionType = 'brushStroke';

    if (!mergedEnter.length && !mergedExit.length) {
        context.applyInteractionStyle(completeSet, { interactionType, apply: false });
        context.applyInteractionStyle(completeSet, { interactionType: 'doubleStroke', apply: false });
    } else {
        if (dragEnd) {
            interactionType = 'doubleStroke';
            // onDrag style
            context.applyInteractionStyle(completeSet, { interactionType: 'brushStroke', apply: false });
            // Fade out points onDragEnd
            context.applyInteractionStyle(mergedExit, { interactionType: 'focus', apply: true });
        }
        const layers = context.firebolt.context.layers();

        layers.forEach((layer) => {
            const layerName = layer.constructor.formalName();

            // Apply style only on the hovered layer
            if (layerName === 'area') {
                context.applyInteractionStyle(mergedEnter, { interactionType: 'fade', apply: true }, [layer]);
                context.applyInteractionStyle(mergedExit, { interactionType: 'fade', apply: false }, [layer]);
            } else {
                // dragEnd style
                context.applyInteractionStyle(mergedExit, { interactionType, apply: false }, [layer]);
                !payload.dragEnd &&
                    context.applyInteractionStyle(mergedExit, { interactionType: 'focus', apply: false });
                interactionType !== 'doubleStroke' &&
                    context.applyInteractionStyle(mergedExit, { interactionType: 'doubleStroke', apply: false });
                context.applyInteractionStyle(mergedEnter, { interactionType, apply: true }, [layer]);
            }
        });
    }
};

export const strategies = {
    fade: fadeFn,
    fadeOnBrush: fadeOnBrushFn,
    focus: (set, context) => {
        const { formattedSet } = set;
        const {
            mergedEnter,
            mergedExit,
            completeSet
        } = formattedSet;
        const { firebolt } = context;

        if (!mergedEnter.length && !mergedExit.length) {
            context.applyInteractionStyle(completeSet, { interactionType: 'focus', apply: false });
            context.applyInteractionStyle(completeSet, { interactionType: 'focusStroke', apply: false });
            context.applyInteractionStyle(completeSet, { interactionType: 'commonDoubleStroke', apply: false });
        } else {
            context.applyInteractionStyle(mergedExit, { interactionType: 'focus', apply: true });
            context.applyInteractionStyle(mergedEnter, { interactionType: 'focus', apply: false });

            context.applyInteractionStyle(mergedExit, { interactionType: 'focusStroke', apply: false });
            context.applyInteractionStyle(mergedEnter, { interactionType: 'focusStroke', apply: true });

            const payload = firebolt.getPayload(BEHAVIOURS.HIGHLIGHT);
            const entryExitSet = firebolt.getEntryExitSet(BEHAVIOURS.HIGHLIGHT);
            const layers = firebolt.context.layers();

            if (payload.target && entryExitSet) {
                layers.forEach((layer) => {
                    // get uids of only the currently highlighted point
                    const actualPoint = layer.getUidsFromPayload(entryExitSet.mergedEnter, payload.target);

                    const commonSet = intersect(mergedEnter.uids, actualPoint.uids,
                        [v => v[0], v => v[0]]);
                    context.applyInteractionStyle({
                        uids: commonSet
                    }, { interactionType: 'commonDoubleStroke', apply: true }, [layer]);
                });
            }
        }
    },
    areaFocus: (set, context) => {
        const { formattedSet } = set;
        const {
            mergedEnter,
            mergedExit,
            completeSet
        } = formattedSet;
        if (!mergedEnter.length && !mergedExit.length) {
            context.applyInteractionStyle(completeSet, { interactionType: 'focus', apply: false });
            context.applyInteractionStyle(completeSet, { interactionType: 'focusStroke', apply: false });
        } else {
            context.applyInteractionStyle(mergedExit, { interactionType: 'focus', apply: false });
            context.applyInteractionStyle(mergedEnter, { interactionType: 'focus', apply: true });

            context.applyInteractionStyle(mergedExit, { interactionType: 'focusStroke', apply: false });
            context.applyInteractionStyle(mergedEnter, { interactionType: 'focusStroke', apply: true });
        }
    },
    highlight: (set, context, payload, excludeSetIds) => {
        const { formattedSet, selectionSet } = set;
        const {
            mergedEnter,
            mergedExit
        } = formattedSet;

        if (!mergedEnter.length && !mergedExit.length) {
            // Remove focusStroke on selected but currently non-highlighted set
            context.applyInteractionStyle(selectionSet.completeSet, { interactionType: 'highlight', apply: false });
            context.applyInteractionStyle(selectionSet.completeSet,
                { interactionType: 'commonDoubleStroke', apply: false }
            );
        } else {
            const layers = context.firebolt.context.layers();

            layers.forEach((layer) => {
                if (payload.target) {
                    // get uids of only the currently highlighted point
                    const actualPoint = layer.getUidsFromPayload(selectionSet.mergedEnter, payload.target);
                    // get uids of only the currently highlighted point excluding the excludeSet ids
                    const currentHighlightedSet = getFormattedSet(actualPoint, excludeSetIds);

                    // Apply highlight on the currently hovered point
                    context.applyInteractionStyle(currentHighlightedSet,
                        { interactionType: 'highlight', apply: true },
                        [layer]
                    );

                    context.applyInteractionStyle(selectionSet.mergedExit,
                        { interactionType: 'highlight', apply: false },
                        [layer]
                    );

                    const selectEntrySet = context.firebolt.getEntryExitSet('select');
                    if (selectEntrySet) {
                        const commonSet = intersect(selectEntrySet.mergedEnter.uids, actualPoint.uids,
                            [v => v[0], v => v[0]]);
                        const diffSet = difference(selectEntrySet.mergedEnter.uids, actualPoint.uids,
                            [v => v[0], v => v[0]]);

                        if (commonSet.length) {
                            context.applyInteractionStyle({
                                uids: commonSet
                            },
                                    { interactionType: 'commonDoubleStroke', apply: true },
                                    [layer]
                                );
                        }
                        context.applyInteractionStyle({
                            uids: diffSet
                        },
                            { interactionType: 'commonDoubleStroke', apply: false },
                            [layer]
                        );
                    }
                }
            });
        }
    },
    pseudoFocus: (set, context) => {
        const { formattedSet } = set;
        const {
            mergedEnter
        } = formattedSet;

        context.applyInteractionStyle(mergedEnter, { interactionType: 'focus', apply: false });
    }
};
