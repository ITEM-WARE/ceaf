import { Link } from 'react-router-dom';
import { useProfiles, useSettings } from '../hooks/useFirebase';
import { PlusCircle, Users, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

export function Home() {
  const profiles = useProfiles();
  const settings = useSettings();
  const { role } = useAuth();
  const profileCount = profiles ? profiles.length : undefined;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4 py-12">
        {settings?.appLogo && (
          <img src={settings.appLogo} alt="App Logo" className="mx-auto h-32 w-auto object-contain mb-6" />
        )}
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          CEAF Donations
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Applicant Ranking System
        </p>
      </div>

      <div className={`grid grid-cols-1 ${(role === 'admin' || role === 'adder') ? 'md:grid-cols-2' : ''} gap-6`}>
        {(role === 'admin' || role === 'adder') && (
          <Link
            to="/create"
            className="group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all hover:border-emerald-500 flex flex-col items-center text-center space-y-4"
          >
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full group-hover:scale-110 transition-transform">
              <PlusCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Create New Profile</h3>
            <p className="text-slate-500 text-sm">
              Record a new applicant's details and automatically calculate their applicant score.
            </p>
          </Link>
        )}

        <Link
          to="/profiles"
          className="group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all hover:border-blue-500 flex flex-col items-center text-center space-y-4"
        >
          <div className="p-4 bg-blue-100 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">View Profiles</h3>
          <p className="text-slate-500 text-sm">
            Browse, search, and manage existing applicant profiles.
          </p>
        </Link>
      </div>

      <div className="bg-slate-100 rounded-2xl p-6 text-center mt-8 border border-slate-200">
        <div className="flex items-center justify-center space-x-2 text-slate-600 mb-2">
          <FileText className="w-5 h-5" />
          <h2 className="text-lg font-medium">Database Status</h2>
        </div>
        <p className="text-3xl font-bold text-slate-900">
          {profileCount !== undefined ? profileCount : '...'}
        </p>
        <p className="text-sm text-slate-500 uppercase tracking-wider mt-1">Total Profiles Stored</p>
      </div>
    </motion.div>
  );
}
