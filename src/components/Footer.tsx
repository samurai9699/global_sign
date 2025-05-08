import React from 'react';
import { Github, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-primary-100">
              &copy; {new Date().getFullYear()} Global Sign AI Bridge
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <a 
              href="#" 
              className="text-primary-200 hover:text-white transition flex items-center"
              aria-label="GitHub Repository"
            >
              <Github className="h-5 w-5 mr-1" />
              <span className="text-sm">GitHub</span>
            </a>
            
            <a 
              href="#" 
              className="text-primary-200 hover:text-white transition flex items-center"
              aria-label="Support the project"
            >
              <Heart className="h-5 w-5 mr-1" />
              <span className="text-sm">Support</span>
            </a>
          </div>
        </div>
        
        <div className="mt-6 text-xs text-center text-primary-300">
          <p>
            Dedicated to making communication accessible for everyone around the world
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;