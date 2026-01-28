const ConfirmDeleteModal = ({ open, onCancel, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-xl bg-[#1f1f1f] p-6 text-white shadow-xl">
        <h2 className="text-lg font-semibold mb-2">Delete chat?</h2>

        <p className="text-sm text-gray-300 mb-4">
          This will delete <span className="font-semibold">this chat</span>.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full cursor-pointer px-4 py-1.5 text-sm bg-gray-700 hover:bg-gray-600"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded-full px-4 cursor-pointer py-1.5 text-sm bg-red-700 hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
