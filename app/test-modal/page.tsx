"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input } from "@heroui/react";

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-10">
      <h1 className="text-2xl mb-4">Modal Test Page</h1>
      <Button color="primary" onPress={() => setIsOpen(true)}>
        Open Modal
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Test Modal</ModalHeader>
              <ModalBody>
                <Input label="Test Input" placeholder="Type something..." />
                <p>If you can see this, the modal is working!</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button color="primary" onPress={onClose}>
                  OK
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
