import { useRef, useState, TouchEvent } from "react";

export const useSwipeToDismiss = (onDismiss: () => void, threshold = 0.3) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const containerWidth = useRef(0);
  const directionLocked = useRef(false);
  const isVertical = useRef(false);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    containerWidth.current =
      e.currentTarget.getBoundingClientRect().width;
    directionLocked.current = false;
    isVertical.current = false;
    setIsSwiping(true);
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (isVertical.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;

    // Make sure swiping horizontally to not interfere with scrolling
    if (!directionLocked.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isVertical.current = true;
        setIsSwiping(false);
        setOffsetX(0);
        return;
      }
      if (Math.abs(deltaX) > 5) {
        directionLocked.current = true;
      }
    }

    // Only allow swiping left (negative)
    if (deltaX < 0) {
      setOffsetX(deltaX);
    }
  };

  const onTouchEnd = () => {
    if (
      !isVertical.current &&
      Math.abs(offsetX) > containerWidth.current * threshold
    ) {
      onDismiss();
    }
    setOffsetX(0);
    setIsSwiping(false);
  };

  return { onTouchStart, onTouchMove, onTouchEnd, offsetX, isSwiping };
}
