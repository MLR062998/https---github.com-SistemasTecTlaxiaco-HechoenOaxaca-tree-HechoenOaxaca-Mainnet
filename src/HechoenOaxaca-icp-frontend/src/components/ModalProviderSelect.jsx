// src/components/ModalProviderSelect.jsx
import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

const providers = [
  {
    name: "NFID",
    url: "https://nfid.one/authenticate",
  },
  {
    name: "Internet Identity",
    url: "https://identity.ic0.app/#authorize",
  },
];

const ModalProviderSelect = ({ isOpen, onClose, onSelectProvider }) => {
  return (
    <Modal show={isOpen} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Seleccionar proveedor</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {providers.map((provider) => (
          <Button
            key={provider.name}
            onClick={() => onSelectProvider(provider.url)}
            variant="outline-primary"
            className="w-100 mb-2"
          >
            {provider.name}
          </Button>
        ))}
      </Modal.Body>
    </Modal>
  );
};

export default ModalProviderSelect;
