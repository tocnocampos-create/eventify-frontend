import { useRef, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Adds click-and-drag horizontal scrolling on web desktop.
 * Returns a ref callback to attach to ScrollView or FlatList.
 *
 * Supports merging with an existing ref via the `existingRef` parameter.
 *
 * Usage:
 *   const dragRef = useDragScroll();
 *   <ScrollView horizontal ref={dragRef} />
 *
 *   // With existing ref:
 *   const dragRef = useDragScroll(myRef);
 *   <FlatList horizontal ref={dragRef} />
 */
export default function useDragScroll(existingRef) {
  const cleanupRef = useRef(null);

  const refCallback = useCallback((instance) => {
    // Forward to existing ref
    if (existingRef) {
      if (typeof existingRef === 'function') existingRef(instance);
      else existingRef.current = instance;
    }

    // Clean up previous listeners
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!instance) return;

    const scrollEl = instance.getScrollableNode?.() ?? instance;
    if (!scrollEl?.addEventListener) return;

    const state = { isDown: false, startX: 0, scrollLeft: 0 };
    scrollEl.style.cursor = 'grab';

    const onDown = (e) => {
      state.isDown = true;
      state.startX = e.pageX;
      state.scrollLeft = scrollEl.scrollLeft;
      scrollEl.style.cursor = 'grabbing';
      scrollEl.style.userSelect = 'none';
      // Disable scroll snapping during drag for smooth movement
      scrollEl.style.scrollSnapType = 'none';
      scrollEl.style.scrollBehavior = 'auto';
    };

    const onMove = (e) => {
      if (!state.isDown) return;
      e.preventDefault();
      scrollEl.scrollLeft = state.scrollLeft - (e.pageX - state.startX);
    };

    const onUp = () => {
      if (!state.isDown) return;
      state.isDown = false;
      scrollEl.style.cursor = 'grab';
      scrollEl.style.userSelect = '';
      // Re-enable scroll snapping
      scrollEl.style.scrollSnapType = '';
      scrollEl.style.scrollBehavior = '';
    };

    scrollEl.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    scrollEl.addEventListener('mouseleave', onUp);

    cleanupRef.current = () => {
      scrollEl.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      scrollEl.removeEventListener('mouseleave', onUp);
    };
  }, [existingRef]);

  if (Platform.OS !== 'web') return existingRef ?? undefined;
  return refCallback;
}
