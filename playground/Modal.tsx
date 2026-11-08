import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * W3C ARIA Authoring Practices - Selector for interactive, focusable elements.
 * Covers all standard elements that participate in keyboard navigation.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  'summary',
].join(', ');

/**
 * Determines whether an element is visible in the layout and eligible for focus.
 */
function isFocusableVisible(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
    return false;
  }

  return (
    element.offsetWidth > 0 ||
    element.offsetHeight > 0 ||
    element.getClientRects().length > 0
  );
}

/**
 * Queries all visible focusable elements inside a container.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  return candidates.filter(isFocusableVisible);
}

/**
 * Context value shared between Modal and its compound child components.
 */
export interface ModalContextValue {
  titleId: string;
  descriptionId: string;
  onClose: () => void;
  hasTitle: boolean;
  setHasTitle: (value: boolean) => void;
  hasDescription: boolean;
  setHasDescription: (value: boolean) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/**
 * Hook to access ModalContext inside compound components.
 */
export function useModalContext(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('Modal compound components must be rendered inside a <Modal> component.');
  }
  return context;
}

export interface ModalProps {
  /** Controls open/closed state of the modal */
  isOpen: boolean;
  /** Callback fired when modal requests to close (Escape key, overlay click, close button) */
  onClose: () => void;
  /** Modal content. Accepts elements or compound components (<Modal.Header>, etc.) */
  children: React.ReactNode;
  /** Title text/node. Automatically creates an accessible h2 linked via aria-labelledby */
  title?: React.ReactNode;
  /** Description text/node. Automatically linked via aria-describedby */
  description?: React.ReactNode;
  /** Accessible label when no visible heading exists */
  ariaLabel?: string;
  /** Explicit element ID for aria-labelledby (overrides generated title ID) */
  ariaLabelledBy?: string;
  /** Explicit element ID for aria-describedby (overrides generated description ID) */
  ariaDescribedBy?: string;
  /** W3C ARIA role: 'dialog' (default) or 'alertdialog' for urgent confirmations */
  role?: 'dialog' | 'alertdialog';
  /** Ref to element that receives focus when opened. Defaults to first focusable element */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Ref to element that receives focus when closed. Defaults to opening trigger element */
  finalFocusRef?: React.RefObject<HTMLElement | null>;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Whether clicking the backdrop overlay closes the modal (default: true) */
  closeOnOverlayClick?: boolean;
  /** Whether to render default close button when using simple title prop (default: true) */
  showCloseButton?: boolean;
  /** Accessible label for the default close button (default: "Close dialog") */
  closeButtonAriaLabel?: string;
  /** Custom portal container element (defaults to document.body) */
  portalContainer?: HTMLElement | null;
  /** CSS class name for dialog container */
  className?: string;
  /** CSS class name for backdrop overlay */
  overlayClassName?: string;
  /** Inline style overrides for dialog container */
  style?: React.CSSProperties;
  /** Inline style overrides for backdrop overlay */
  overlayStyle?: React.CSSProperties;
  /** HTML id attribute for dialog element */
  id?: string;
}

/**
 * Fully accessible Modal Dialog component compliant with W3C WAI-ARIA Authoring Practices.
 *
 * ARIA Specifications implemented:
 * 1. Role: role="dialog" or role="alertdialog", aria-modal="true"
 * 2. Labeling: aria-labelledby referencing title, or aria-label; aria-describedby for description
 * 3. Focus Trap: Tab and Shift+Tab wrap within dialog elements, never leaking to background
 * 4. Focus Management: Auto-focus first focusable element on open; restore focus to trigger on close
 * 5. Keyboard Navigation: Escape key closes modal and stops outer propagation
 * 6. Accessibility Isolation: inert and aria-hidden applied to document background nodes
 * 7. Scroll Lock: Disables document body scrolling while open, compensating for scrollbar shift
 * 8. Strict TypeScript: Zero 'any' types used across all props and internals
 */
export const Modal: React.FC<ModalProps> & {
  Header: React.FC<ModalHeaderProps>;
  Title: React.FC<ModalTitleProps>;
  Description: React.FC<ModalDescriptionProps>;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
  CloseButton: React.FC<ModalCloseButtonProps>;
} = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  role = 'dialog',
  initialFocusRef,
  finalFocusRef,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  closeButtonAriaLabel = 'Close dialog',
  portalContainer,
  className = '',
  overlayClassName = '',
  style,
  overlayStyle,
  id,
}) => {
  const generatedId = useId();
  const modalId = id ?? `modal-${generatedId}`;
  const defaultTitleId = `modal-title-${generatedId}`;
  const defaultDescId = `modal-desc-${generatedId}`;

  const [hasCompoundTitle, setHasCompoundTitle] = useState<boolean>(false);
  const [hasCompoundDesc, setHasCompoundDesc] = useState<boolean>(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const portalNodeRef = useRef<HTMLDivElement | null>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  const effectiveHasTitle = Boolean(title) || hasCompoundTitle;
  const effectiveHasDesc = Boolean(description) || hasCompoundDesc;

  // Resolve accessibility attributes
  const computedTitleId = ariaLabel
    ? undefined
    : (ariaLabelledBy ?? (effectiveHasTitle ? defaultTitleId : undefined));

  const computedDescId = ariaDescribedBy ?? (effectiveHasDesc ? defaultDescId : undefined);

  /* -------------------------------------------------------------------------- */
  /*            Focus Preservation & Restoration (Trigger Element)              */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    // Modal just opened: capture the currently focused element (the trigger)
    if (isOpen && !prevIsOpenRef.current) {
      if (document.activeElement instanceof HTMLElement) {
        triggerElementRef.current = document.activeElement;
      }
    }

    // Modal just closed: restore focus to finalFocusRef or opening trigger
    if (!isOpen && prevIsOpenRef.current) {
      const target = finalFocusRef?.current ?? triggerElementRef.current;
      if (target && document.contains(target)) {
        window.requestAnimationFrame(() => {
          if (target && document.contains(target)) {
            target.focus();
          }
        });
      }
      triggerElementRef.current = null;
    }

    prevIsOpenRef.current = isOpen;
  }, [isOpen, finalFocusRef]);

  // Handle unmount while open (e.g. conditional rendering {isOpen && <Modal ... />})
  useEffect(() => {
    return () => {
      if (prevIsOpenRef.current) {
        const target = finalFocusRef?.current ?? triggerElementRef.current;
        if (target && document.contains(target)) {
          target.focus();
        }
      }
    };
  }, [finalFocusRef]);

  /* -------------------------------------------------------------------------- */
  /*                            Initial Focus                                   */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    let rafId: number | null = null;
    rafId = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      // 1. If explicit initialFocusRef provided and valid, focus it
      if (initialFocusRef?.current && isFocusableVisible(initialFocusRef.current)) {
        initialFocusRef.current.focus();
        return;
      }

      // 2. Otherwise focus first visible focusable element
      const focusable = getFocusableElements(dialog);
      if (focusable.length > 0) {
        focusable[0].focus();
        return;
      }

      // 3. Fallback: focus dialog container (tabIndex={-1})
      dialog.focus();
    });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isOpen, initialFocusRef]);

  /* -------------------------------------------------------------------------- */
  /*                      Focus Trap & Keyboard Navigation                      */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Handle Escape key
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      // 2. Handle Tab key (Focus Trap)
      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = getFocusableElements(dialog);

        // If no focusable elements inside dialog, keep focus on dialog container
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        // If focus is outside dialog, pull it inside
        if (!dialog.contains(activeElement)) {
          event.preventDefault();
          if (event.shiftKey) {
            lastElement.focus();
          } else {
            firstElement.focus();
          }
          return;
        }

        // Shift + Tab (Backward navigation)
        if (event.shiftKey) {
          if (activeElement === firstElement || activeElement === dialog) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab (Forward navigation)
          if (activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          } else if (activeElement === dialog) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Attach to document in capture phase to reliably intercept keys before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, closeOnEscape, onClose]);

  /* -------------------------------------------------------------------------- */
  /*                     Global Focus Containment (focusin)                     */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen) return;

    const handleFocusIn = (event: FocusEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      // If focus escaped the dialog, direct it back inside
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const focusable = getFocusableElements(dialog);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialog.focus();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);
    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [isOpen]);

  /* -------------------------------------------------------------------------- */
  /*              Screen Reader Isolation (inert & aria-hidden)                 */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const portalEl = portalNodeRef.current;
    if (!portalEl) return;

    const siblings = Array.from(document.body.children).filter(
      (child) => child !== portalEl && !portalEl.contains(child)
    );

    interface SiblingCleanupRecord {
      element: HTMLElement;
      hadInert: boolean;
      prevAriaHidden: string | null;
    }

    const records: SiblingCleanupRecord[] = siblings.map((sibling) => {
      const el = sibling as HTMLElement;
      const hadInert = el.hasAttribute('inert');
      const prevAriaHidden = el.getAttribute('aria-hidden');

      el.setAttribute('aria-hidden', 'true');
      if ('inert' in el) {
        el.inert = true;
      }

      return { element: el, hadInert, prevAriaHidden };
    });

    return () => {
      records.forEach(({ element, hadInert, prevAriaHidden }) => {
        if (!hadInert && 'inert' in element) {
          element.inert = false;
        }
        if (prevAriaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', prevAriaHidden);
        }
      });
    };
  }, [isOpen]);

  /* -------------------------------------------------------------------------- */
  /*                      Body Scroll Lock & Shift Prevention                   */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  /* -------------------------------------------------------------------------- */
  /*                            Overlay Click Handler                           */
  /* -------------------------------------------------------------------------- */

  const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    mouseDownTargetRef.current = event.target;
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only close if mouse down and mouse up both occurred on overlay itself
    if (
      closeOnOverlayClick &&
      event.target === overlayRef.current &&
      mouseDownTargetRef.current === overlayRef.current
    ) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const contextValue: ModalContextValue = {
    titleId: defaultTitleId,
    descriptionId: defaultDescId,
    onClose,
    hasTitle: effectiveHasTitle,
    setHasTitle: setHasCompoundTitle,
    hasDescription: effectiveHasDesc,
    setHasDescription: setHasCompoundDesc,
  };

  const defaultOverlayStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 9999,
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    overflowY: 'auto',
    ...overlayStyle,
  };

  const defaultDialogStyles: React.CSSProperties = {
    position: 'relative',
    backgroundColor: '#ffffff',
    color: '#111827',
    borderRadius: '0.625rem',
    boxShadow:
      '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
    width: '100%',
    maxWidth: '32rem',
    maxHeight: 'calc(100vh - 2rem)',
    display: 'flex',
    flexDirection: 'column',
    outline: 'none',
    boxSizing: 'border-box',
    ...style,
  };

  const modalNode = (
    <div
      ref={portalNodeRef}
      className="a11y-modal-portal"
      data-testid="modal-portal"
    >
      <div
        ref={overlayRef}
        className={`a11y-modal-overlay ${overlayClassName}`.trim()}
        style={defaultOverlayStyles}
        onMouseDown={handleOverlayMouseDown}
        onClick={handleOverlayClick}
      >
        <div
          ref={dialogRef}
          id={modalId}
          role={role}
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={computedTitleId}
          aria-describedby={computedDescId}
          tabIndex={-1}
          className={`a11y-modal-dialog ${className}`.trim()}
          style={defaultDialogStyles}
        >
          <ModalContext.Provider value={contextValue}>
            {/* Top-level Title if title prop provided */}
            {title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <h2
                  id={defaultTitleId}
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    lineHeight: '1.5rem',
                    color: '#111827',
                  }}
                >
                  {title}
                </h2>
                {showCloseButton && (
                  <ModalCloseButton ariaLabel={closeButtonAriaLabel} />
                )}
              </div>
            )}

            {/* Close button if no title prop provided and not suppressed */}
            {!title && showCloseButton && !hasCompoundTitle && (
              <div
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  zIndex: 1,
                }}
              >
                <ModalCloseButton ariaLabel={closeButtonAriaLabel} />
              </div>
            )}

            {/* Top-level Description if description prop provided */}
            {description && (
              <p
                id={defaultDescId}
                style={{
                  margin: 0,
                  padding: '0.75rem 1.5rem 0',
                  fontSize: '0.875rem',
                  color: '#4b5563',
                  lineHeight: '1.25rem',
                }}
              >
                {description}
              </p>
            )}

            {/* Modal Body & Children */}
            <div style={{ flex: '1 1 auto', overflowY: 'auto' }}>
              {children}
            </div>
          </ModalContext.Provider>
        </div>
      </div>
    </div>
  );

  const mountTarget =
    portalContainer ?? (typeof document !== 'undefined' ? document.body : null);
  return mountTarget ? createPortal(modalNode, mountTarget) : null;
};

/* -------------------------------------------------------------------------- */
/*                            Compound Components                             */
/* -------------------------------------------------------------------------- */

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  className = '',
  style,
  ...rest
}) => {
  return (
    <header
      className={`a11y-modal-header ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        ...style,
      }}
      {...rest}
    >
      {children}
    </header>
  );
};

export interface ModalTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const ModalTitle: React.FC<ModalTitleProps> = ({
  children,
  as: Component = 'h2',
  id,
  className = '',
  style,
  ...rest
}) => {
  const { titleId, setHasTitle } = useModalContext();

  useEffect(() => {
    setHasTitle(true);
    return () => setHasTitle(false);
  }, [setHasTitle]);

  return (
    <Component
      id={id ?? titleId}
      className={`a11y-modal-title ${className}`.trim()}
      style={{
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: '1.5rem',
        color: '#111827',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
};

export interface ModalDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const ModalDescription: React.FC<ModalDescriptionProps> = ({
  children,
  id,
  className = '',
  style,
  ...rest
}) => {
  const { descriptionId, setHasDescription } = useModalContext();

  useEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <p
      id={id ?? descriptionId}
      className={`a11y-modal-description ${className}`.trim()}
      style={{
        margin: '0.25rem 0 0',
        fontSize: '0.875rem',
        color: '#4b5563',
        lineHeight: '1.25rem',
        ...style,
      }}
      {...rest}
    >
      {children}
    </p>
  );
};

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className = '',
  style,
  ...rest
}) => {
  return (
    <div
      className={`a11y-modal-body ${className}`.trim()}
      style={{
        padding: '1.25rem 1.5rem',
        overflowY: 'auto',
        color: '#374151',
        fontSize: '0.9375rem',
        lineHeight: '1.5rem',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = '',
  style,
  ...rest
}) => {
  return (
    <footer
      className={`a11y-modal-footer ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.75rem',
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        borderBottomLeftRadius: '0.625rem',
        borderBottomRightRadius: '0.625rem',
        ...style,
      }}
      {...rest}
    >
      {children}
    </footer>
  );
};

export interface ModalCloseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
}

export const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({
  ariaLabel = 'Close dialog',
  className = '',
  style,
  onClick,
  ...rest
}) => {
  const { onClose } = useModalContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      onClose();
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`a11y-modal-close-button ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2rem',
        height: '2rem',
        padding: 0,
        margin: 0,
        border: 'none',
        borderRadius: '0.375rem',
        backgroundColor: 'transparent',
        color: '#6b7280',
        cursor: 'pointer',
        transition: 'color 150ms ease, background-color 150ms ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f3f4f6';
        e.currentTarget.style.color = '#111827';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = '#6b7280';
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid #2563eb';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
      {...rest}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="4" x2="4" y2="12" />
        <line x1="4" y1="4" x2="12" y2="12" />
      </svg>
    </button>
  );
};

// Compound component attachments
Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Description = ModalDescription;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.CloseButton = ModalCloseButton;

export default Modal;
