"use client";

import { useState } from "react";
import { Button, Input } from "@/app/components/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/app/components/ui/Dialog";

export default function TestModalPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-10">
      <h1 className="text-2xl mb-4">Modal Test Page</h1>
      <Button color="primary" onPress={() => setIsOpen(true)}>
        Open Modal
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Modal</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Input placeholder="Type something..." />
            <p>If you can see this, the modal is working!</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="light" onPress={() => setIsOpen(false)}>
              Close
            </Button>
            <Button color="primary" onPress={() => setIsOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
