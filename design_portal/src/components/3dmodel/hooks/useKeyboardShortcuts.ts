import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { UnknownAction } from 'redux';
import { redoAction, undoAction } from '../store/historySlice';

export const useKeyboardShortcuts = () => {
  /** Custom hook that enables Ctrl+Z (undo) and Ctrl+Y (redo) keyboard shortcuts for design history actions. */

  const dispatch = useDispatch();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            dispatch(undoAction() as unknown as UnknownAction);
            break;
          case 'y':
            event.preventDefault();
            dispatch(redoAction() as unknown as UnknownAction);
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);
};
