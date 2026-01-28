import { Bot, User } from 'lucide-react';

const Navbar = ({ username }) => {
  return (
    <nav className="bg-white shadow-sm border-b px-4 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <img src="./exavalu_logo.png" alt="Logo" className="h-8 w-auto" />
      </div>
      <div className="flex items-center space-x-2">
        <Bot className="text-brand" />
        <h1 className="text-lg font-semibold">Chatbot</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-gray-700">
          <User size={16} />
          <span>{username.split('@')[0]}</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
