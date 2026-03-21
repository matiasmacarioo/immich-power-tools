import React from "react"

/**
 * A robust typewriter component that handles deleting the old text
 * and typing the new text character-by-character.
 */
export const TypewriterText = ({ 
  text, 
  delayDelete = 3, 
  delayType = 10,
  animateOnMount = true 
}: { 
  text: string; 
  delayDelete?: number; 
  delayType?: number;
  animateOnMount?: boolean 
}) => {
  // Use a ref to store the target text to avoid closure stale state
  const targetRef = React.useRef(text);
  const [displayedText, setDisplayedText] = React.useState(animateOnMount ? "" : text);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // When the requested text changes, start the deletion phase
  React.useEffect(() => {
    if (text !== targetRef.current) {
      targetRef.current = text;
      setIsDeleting(true);
    }
  }, [text]);

  React.useEffect(() => {
    // If we've reached the target and aren't deleting, stop.
    if (displayedText === targetRef.current && !isDeleting) return;

    const timeout = setTimeout(() => {
      if (isDeleting) {
        if (displayedText.length > 0) {
          // Delete one char
          setDisplayedText(prev => prev.slice(0, -1));
        } else {
          // Finished deleting, switch to typing
          setIsDeleting(false);
        }
      } else {
        if (displayedText.length < targetRef.current.length) {
          // Type one char
          setDisplayedText(targetRef.current.slice(0, displayedText.length + 1));
        }
      }
    }, isDeleting ? delayDelete : delayType);

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, delayDelete, delayType]);

  return <span className="whitespace-pre-wrap">{displayedText || "\u00A0"}</span>;
};
