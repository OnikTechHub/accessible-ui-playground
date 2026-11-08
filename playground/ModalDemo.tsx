import React, { useRef, useState } from 'react';
import { Modal } from './Modal';

export const ModalDemo: React.FC = () => {
  // Modal 1: Standard interactive form modal
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({ name: '', email: '', subscribe: false });

  // Modal 2: Custom initial focus modal
  const [isCustomFocusModalOpen, setIsCustomFocusModalOpen] = useState<boolean>(false);
  const customInputRef = useRef<HTMLInputElement | null>(null);

  // Modal 3: Alert dialog confirmation modal
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const deleteTriggerButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '2rem auto',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1f2937',
        backgroundColor: '#f9fafb',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <header style={{ marginBottom: '2rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          Accessible Modal Dialog Playground
        </h1>
        <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.5 }}>
          Built strictly according to W3C WAI-ARIA Authoring Practices Guide (APG). Zero external libraries,
          zero <code style={{ backgroundColor: '#e5e7eb', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>any</code> types,
          complete focus management, and keyboard interaction.
        </p>
      </header>

      {/* Trigger Buttons */}
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <button
          type="button"
          onClick={() => setIsFormModalOpen(true)}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Open Form Modal (Standard)
        </button>

        <button
          type="button"
          onClick={() => setIsCustomFocusModalOpen(true)}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#4b5563',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Open with Initial Focus Ref
        </button>

        <button
          ref={deleteTriggerButtonRef}
          type="button"
          onClick={() => setIsAlertModalOpen(true)}
          style={{
            padding: '0.75rem 1.25rem',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Open Alert Dialog (Confirmation)
        </button>
      </section>

      {/* W3C ARIA APG Checklist */}
      <section
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          border: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
          W3C ARIA APG Compliance Checklist
        </h2>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8, margin: 0 }}>
          <li>
            <strong>ARIA Roles:</strong> Container has <code style={{ color: '#2563eb' }}>role="dialog"</code> (or <code style={{ color: '#2563eb' }}>role="alertdialog"</code>) and <code style={{ color: '#2563eb' }}>aria-modal="true"</code>.
          </li>
          <li>
            <strong>Accessible Labeling:</strong> Linked with <code style={{ color: '#2563eb' }}>aria-labelledby</code> targeting the modal title, or <code style={{ color: '#2563eb' }}>aria-label</code>.
          </li>
          <li>
            <strong>Focus Trap:</strong> Pressing <kbd>Tab</kbd> / <kbd>Shift + Tab</kbd> cycles strictly among focusable elements inside the dialog without escaping to background content.
          </li>
          <li>
            <strong>Initial Focus:</strong> Automatically focuses the first focusable element (or custom <code style={{ color: '#2563eb' }}>initialFocusRef</code>).
          </li>
          <li>
            <strong>Focus Restoration:</strong> When closed with <kbd>Escape</kbd>, the close button, or overlay click, focus returns precisely to the trigger element that opened it.
          </li>
          <li>
            <strong>Screen Reader Background Isolation:</strong> Applies <code style={{ color: '#2563eb' }}>inert</code> and <code style={{ color: '#2563eb' }}>aria-hidden="true"</code> to background sibling nodes.
          </li>
          <li>
            <strong>Scroll Lock:</strong> Prevents background page scrolling while modal is active, adjusting for scrollbar width to prevent layout shift.
          </li>
        </ul>
      </section>

      {/* Modal 1: Standard Form Modal (Compound Component API) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
      >
        <Modal.Header>
          <Modal.Title>Edit User Profile</Modal.Title>
          <Modal.CloseButton ariaLabel="Close profile dialog" />
        </Modal.Header>
        <Modal.Body>
          <Modal.Description>
            Update your profile details below. All changes will be saved to your session.
          </Modal.Description>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsFormModalOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}
          >
            <div>
              <label
                htmlFor="user-name-input"
                style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' }}
              >
                Full Name
              </label>
              <input
                id="user-name-input"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.9375rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="user-email-input"
                style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' }}
              >
                Email Address
              </label>
              <input
                id="user-email-input"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.9375rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="user-subscribe-input"
                type="checkbox"
                checked={formData.subscribe}
                onChange={(e) => setFormData({ ...formData, subscribe: e.target.checked })}
              />
              <label htmlFor="user-subscribe-input" style={{ fontSize: '0.875rem' }}>
                Receive product accessibility updates
              </label>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            onClick={() => setIsFormModalOpen(false)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setIsFormModalOpen(false)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Save Changes
          </button>
        </Modal.Footer>
      </Modal>

      {/* Modal 2: Initial Focus Ref Modal (Simple Props API) */}
      <Modal
        isOpen={isCustomFocusModalOpen}
        onClose={() => setIsCustomFocusModalOpen(false)}
        title="Custom Initial Focus"
        description="Focus jumps straight to the second input field via initialFocusRef."
        initialFocusRef={customInputRef}
      >
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              htmlFor="field-1"
              style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}
            >
              First Input (Bypassed)
            </label>
            <input
              id="field-1"
              type="text"
              placeholder="Will not receive initial focus"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="field-2-focused"
              style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#2563eb' }}
            >
              Target Input (Receives Initial Focus)
            </label>
            <input
              ref={customInputRef}
              id="field-2-focused"
              type="text"
              placeholder="Focused immediately on modal open"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '2px solid #2563eb',
                borderRadius: '0.375rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setIsCustomFocusModalOpen(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Alert Dialog (Destructive Action Confirmation) */}
      <Modal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        role="alertdialog"
        title="Delete Resource?"
        description="This action cannot be undone. All data associated with this project will be permanently removed."
        finalFocusRef={deleteTriggerButtonRef}
      >
        <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setIsAlertModalOpen(false)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              alert('Resource deleted!');
              setIsAlertModalOpen(false);
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Confirm Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ModalDemo;

