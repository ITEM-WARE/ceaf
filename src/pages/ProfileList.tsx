import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProfiles, deleteProfile, useSettings, updateProfile } from '../hooks/useFirebase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowUpDown, Trash2, Edit, Eye, Download, User, AlertCircle, AlertTriangle, Filter, X, ListFilter, Heart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Profile, DonationRecord, CustomFilter } from '../db';

type SortOption = 'score' | 'latest' | 'modified' | 'name' | 'applicationNumber';

export function ProfileList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [minScore, setMinScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('');
  const [limit, setLimit] = useState<number>(0);
  const [activeCustomFilters, setActiveCustomFilters] = useState<string[]>([]);
  const [filterOperator, setFilterOperator] = useState<'AND' | 'OR'>('OR');
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { role, donorName, adderName } = useAuth();
  const [showMyDonations, setShowMyDonations] = useState(role === 'donor');
  const [showOnlyMine, setShowOnlyMine] = useState(role === 'adder');
  
  // Donation Modal State
  const [donationModalProfile, setDonationModalProfile] = useState<Profile | null>(null);
  const [newDonation, setNewDonation] = useState({ donorName: '', amount: '', description: '' });
  const [isSavingDonation, setIsSavingDonation] = useState(false);

  const allProfiles = useProfiles();
  const settings = useSettings();

  const districts = useMemo(() => {
    if (!allProfiles) return [];
    const dists = new Set(allProfiles.map(p => p.district).filter(Boolean));
    return Array.from(dists).sort();
  }, [allProfiles]);

  const profiles = useMemo(() => {
    if (!allProfiles) return undefined;
    
    let filtered = [...allProfiles];

    // Apply Donor Filter
    if (role === 'donor' && showMyDonations && donorName) {
      filtered = filtered.filter(p => p.donations?.some(d => d.donorName.toLowerCase() === donorName.toLowerCase()));
    }

    // Apply Adder Filter
    if (role === 'adder' && showOnlyMine && adderName) {
      filtered = filtered.filter(p => p.addedByName === adderName);
    }
    
    // Apply Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      // Support comma separated search
      const terms = lowerTerm.split(',').map(t => t.trim()).filter(Boolean);
      
      if (terms.length > 1) {
        filtered = filtered.filter(p => 
          terms.some(term => 
            (p.name || '').toLowerCase().includes(term) || 
            (p.cnic || '').includes(term) ||
            (p.applicationNumber || '').toLowerCase().includes(term) ||
            (p.phoneNumber || '').includes(term)
          )
        );
      } else {
        filtered = filtered.filter(p => 
          (p.name || '').toLowerCase().includes(lowerTerm) || 
          (p.cnic || '').includes(searchTerm) ||
          (p.applicationNumber || '').toLowerCase().includes(lowerTerm) ||
          (p.phoneNumber || '').includes(searchTerm)
        );
      }
    }

    // Apply Score Filters
    if (minScore !== '') {
      filtered = filtered.filter(p => (p.score || 0) >= Number(minScore));
    }
    if (maxScore !== '') {
      filtered = filtered.filter(p => (p.score || 0) <= Number(maxScore));
    }

    // Apply District Filter
    if (selectedDistrict) {
      filtered = filtered.filter(p => p.district === selectedDistrict);
    }

    // Apply Active Custom Filters (Toggles)
    if (activeCustomFilters.length > 0 && settings?.customFilters) {
      filtered = filtered.filter(p => {
        const matchFn = filterOperator === 'AND' ? 'every' : 'some';
        return activeCustomFilters[matchFn](filterId => {
          const filter = settings.customFilters?.find(f => f.id === filterId);
          if (!filter) return true;
          const answer = p.answers?.[filter.questionId];
          const q = settings?.questions?.find(question => question.id === filter.questionId);
          
          if (q && q.type === 'range' && q.options) {
            const selectedOption = q.options.find(opt => opt.label === filter.answer);
            if (selectedOption) {
              const numValue = Number(answer);
              const min = (selectedOption.min === undefined || selectedOption.min === null || isNaN(selectedOption.min)) ? -Infinity : selectedOption.min;
              const max = (selectedOption.max === undefined || selectedOption.max === null || isNaN(selectedOption.max)) ? Infinity : selectedOption.max;
              return numValue >= min && numValue <= max;
            }
          }
          
          // Handle standard string vs boolean matches
          if (q && q.type === 'boolean') {
            const isYes = String(filter.answer).toLowerCase() === 'yes';
            // true/false or "Yes"/"No"
            const boolAnswer = typeof answer === 'boolean' ? answer : (String(answer).toLowerCase() === 'yes' || String(answer).toLowerCase() === 'true');
            return boolAnswer === isYes;
          }
          
          return String(answer) === String(filter.answer);
        });
      });
    }

    // Apply Dynamic Custom Filters (Selects)
    if (Object.keys(dynamicFilters).length > 0) {
      filtered = filtered.filter(p => {
        return Object.entries(dynamicFilters).every(([qId, targetValue]) => {
          if (!targetValue) return true;
          const answer = p.answers?.[qId];
          const q = settings?.questions?.find(question => question.id === qId);
          
          if (q && q.type === 'range' && q.options) {
            const selectedOption = q.options.find(opt => opt.label === targetValue);
            if (selectedOption) {
              const numValue = Number(answer);
              const min = (selectedOption.min === undefined || selectedOption.min === null || isNaN(selectedOption.min)) ? -Infinity : selectedOption.min;
              const max = (selectedOption.max === undefined || selectedOption.max === null || isNaN(selectedOption.max)) ? Infinity : selectedOption.max;
              return numValue >= min && numValue <= max;
            }
          }
          
          if (q && q.type === 'boolean') {
            const isYes = targetValue.toLowerCase() === 'yes';
            const boolAnswer = typeof answer === 'boolean' ? answer : (String(answer).toLowerCase() === 'yes' || String(answer).toLowerCase() === 'true');
            return boolAnswer === isYes;
          }
          
          return String(answer) === targetValue;
        });
      });
    }

    // Natural sort for sorting
    filtered.sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'latest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === 'modified') return (b.updatedAt || 0) - (a.updatedAt || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'applicationNumber') {
        return (a.applicationNumber || '').localeCompare(b.applicationNumber || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      return 0;
    });

    // Apply Limit
    if (limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [allProfiles, searchTerm, sortBy, selectedDistrict, activeCustomFilters, filterOperator, dynamicFilters, limit, role, showMyDonations, donorName, settings, showOnlyMine, adderName, minScore, maxScore]);

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      try {
        await deleteProfile(id);
        setDeletingId(null);
      } catch (error) {
        console.error("Error deleting profile:", error);
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000); // Reset after 3 seconds
    }
  };

  const handleExportCSV = async () => {
    if (!profiles || profiles.length === 0) {
      setErrorMsg('No profiles to export.');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    const getFollowUpHeaders = (configs: any[], parentText: string): string[] => {
      let headers: string[] = [];
      configs.forEach(fu => {
        const headerName = `${parentText} > ${fu.label}`;
        headers.push(headerName);
        if (fu.followUps) {
          headers = headers.concat(getFollowUpHeaders(fu.followUps, headerName));
        }
      });
      return headers;
    };

    const followUpHeaders: string[] = [];
    settings?.questions?.forEach(q => {
      if (q.followUps) {
        followUpHeaders.push(...getFollowUpHeaders(q.followUps, q.text));
      }
    });

    const dynamicHeaders = settings?.questions?.map(q => q.text) || [];
    const conditionalHeaders = settings?.questions?.filter(q => q.hasConditionalField).map(q => `${q.text} (${q.conditionalLabel})`) || [];

    const headers = [
      'Application Number', 'District', 'Name', 'Father/Husband Name', 'CNIC', 'Address', 'Phone Number', 'Support to Sustain Livelihood', 'Comments',
      ...dynamicHeaders, ...conditionalHeaders, ...followUpHeaders, 'Score', 'Total Donations', 'Donors', 'Created At', 'Updated At'
    ];

    const escapeCSV = (str: any) => {
      if (str === null || str === undefined) return '';
      const stringified = String(str);
      if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
        return `"${stringified.replace(/"/g, '""')}"`;
      }
      return stringified;
    };

    const getFollowUpAnswers = (configs: any[], parentText: string, conditionalAnswers: any, parentAnswer: any): string[] => {
      let answers: string[] = [];
      configs.forEach(fu => {
        const headerName = `${parentText} > ${fu.label}`;
        
        // Only extract the answer if the parent answer matches the trigger value
        const isTriggered = String(parentAnswer) === String(fu.triggerValue);
        const ans = isTriggered ? conditionalAnswers?.[fu.id] : undefined;
        
        if (typeof ans === 'boolean') answers.push(ans ? 'Yes' : 'No');
        else answers.push(ans || '');
        
        if (fu.followUps) {
          answers = answers.concat(getFollowUpAnswers(fu.followUps, headerName, conditionalAnswers, ans));
        }
      });
      return answers;
    };

    const csvRows = [
      headers.join(','),
      ...profiles.map(p => {
        const dynamicAnswers = settings?.questions?.map(q => {
          const ans = p.answers?.[q.id];
          if (typeof ans === 'boolean') return ans ? 'Yes' : 'No';
          return ans || '';
        }) || [];
        const conditionalAnswers = settings?.questions?.filter(q => q.hasConditionalField).map(q => {
          const mainAns = p.answers?.[q.id];
          const isTriggered = String(mainAns) === String(q.conditionalTrigger);
          return isTriggered ? (p.conditionalAnswers?.[q.id] || '') : '';
        }) || [];
        
        const followUpAnswers: string[] = [];
        settings?.questions?.forEach(q => {
          if (q.followUps) {
            followUpAnswers.push(...getFollowUpAnswers(q.followUps, q.text, p.conditionalAnswers, p.answers?.[q.id]));
          }
        });

        const totalDonations = p.donations?.reduce((sum, don) => sum + don.amount, 0) || 0;
        const donorsList = p.donations?.map(don => `${don.donorName} (PKR ${don.amount})`).join('; ') || '';

        return [
          p.applicationNumber, p.district, p.name, p.fatherName, p.cnic, p.address, p.phoneNumber, p.supportToSustainLivelihood, p.comments,
          ...dynamicAnswers, ...conditionalAnswers, ...followUpAnswers, p.score || 0, 
          totalDonations, donorsList,
          p.createdAt ? new Date(p.createdAt).toLocaleString() : '', 
          p.updatedAt ? new Date(p.updatedAt).toLocaleString() : ''
        ].map(escapeCSV).join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = limit > 0 
      ? `ceaf-top-${limit}-deserving-cases-${new Date().toISOString().split('T')[0]}.csv`
      : `ceaf-profiles-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDistrict('');
    setMinScore('');
    setMaxScore('');
    setDynamicFilters({});
    setActiveCustomFilters([]);
    setLimit(0);
  };

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationModalProfile || !newDonation.donorName || !newDonation.amount) return;
    
    setIsSavingDonation(true);
    try {
      const donation: DonationRecord = {
        id: 'don_' + Date.now().toString(),
        donorName: newDonation.donorName,
        amount: Number(newDonation.amount),
        date: Date.now()
      };
      if (newDonation.description) {
        donation.description = newDonation.description;
      }
      
      const updatedDonations = [...(donationModalProfile.donations || []), donation];
      await updateProfile(donationModalProfile.id!, { donations: updatedDonations });
      
      // Update local state to show immediately
      setDonationModalProfile({ ...donationModalProfile, donations: updatedDonations });
      setNewDonation({ donorName: '', amount: '', description: '' });
    } catch (error) {
      console.error("Error adding donation:", error);
      setErrorMsg("Failed to add donation.");
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setIsSavingDonation(false);
    }
  };

  const activeFilterCount = (selectedDistrict ? 1 : 0) + 
    activeCustomFilters.length + 
    Object.values(dynamicFilters).filter(v => v !== '').length +
    (limit > 0 ? 1 : 0) + 
    (minScore ? 1 : 0) + 
    (maxScore ? 1 : 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Applicant Profiles</h1>
        
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap justify-end">
            {role === 'donor' && (
              <button
                onClick={() => setShowMyDonations(!showMyDonations)}
                className={`inline-flex items-center px-4 py-2 border rounded-xl shadow-sm text-sm font-medium transition-all ${
                  showMyDonations 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Heart className="w-4 h-4 mr-2" />
                {showMyDonations ? 'View All Profiles' : 'View My Donations'}
              </button>
            )}

            {role === 'adder' && (
              <button
                onClick={() => setShowOnlyMine(!showOnlyMine)}
                className={`inline-flex items-center px-4 py-2 border rounded-xl shadow-sm text-sm font-medium transition-all ${
                  showOnlyMine 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4 mr-2" />
                {showOnlyMine ? 'Show All Profiles' : 'Show Only My Added'}
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-4 py-2 border border-emerald-200 rounded-xl shadow-sm text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" /> 
              {limit > 0 ? `Export Top ${limit}` : 'Export CSV'}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border rounded-xl shadow-sm text-sm font-medium transition-all ${
                showFilters || activeFilterCount > 0 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search name, CNIC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-full sm:w-48 transition-all"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="h-5 w-5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="py-2 pl-3 pr-8 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white transition-all text-sm"
              >
                <option value="score">Highest Score</option>
                <option value="latest">Latest Added</option>
                <option value="modified">Last Modified</option>
                <option value="name">Name (A-Z)</option>
                <option value="applicationNumber">App No.</option>
              </select>
            </div>
          </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <ListFilter className="w-5 h-5 mr-2 text-emerald-600" />
                  Advanced Filters
                </h3>
                <button 
                  onClick={clearFilters}
                  className="text-sm text-slate-500 hover:text-red-600 flex items-center transition-colors"
                >
                  <X className="w-4 h-4 mr-1" /> Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* District Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">District</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full py-2 pl-3 pr-8 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white transition-all text-sm"
                  >
                    <option value="">All Districts</option>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Score Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score Range</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      className="w-full py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      className="w-full py-2 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Limit Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Show Top N Cases</label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full py-2 pl-3 pr-8 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white transition-all text-sm"
                  >
                    <option value={0}>All Cases</option>
                    <option value={10}>Top 10</option>
                    <option value={25}>Top 25</option>
                    <option value={50}>Top 50</option>
                    <option value={100}>Top 100</option>
                    <option value={200}>Top 200</option>
                  </select>
                </div>

                {/* Custom Dynamic Filters */}
                {settings?.customFilters?.filter(f => f.mode === 'select').map(filter => {
                  const q = settings.questions.find(q => q.id === filter.questionId);
                  if (!q) return null;
                  return (
                    <div key={filter.id} className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{filter.label}</label>
                      <select
                        value={dynamicFilters[q.id] || ''}
                        onChange={(e) => setDynamicFilters({ ...dynamicFilters, [q.id]: e.target.value })}
                        className="w-full py-2 pl-3 pr-8 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white transition-all text-sm"
                      >
                        <option value="">All Answers</option>
                        {q.type === 'boolean' ? (
                          <>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </>
                        ) : q.options?.map((opt, i) => (
                          <option key={i} value={opt.label}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Quick Toggle Buttons */}
              {settings?.customFilters && settings.customFilters.some(f => f.mode !== 'select') && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Toggles</label>
                    <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setFilterOperator('OR')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                          filterOperator === 'OR' 
                            ? 'bg-white text-emerald-600 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        MATCH ANY (OR)
                      </button>
                      <button
                        onClick={() => setFilterOperator('AND')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                          filterOperator === 'AND' 
                            ? 'bg-white text-emerald-600 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        MATCH ALL (AND)
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {settings.customFilters
                      .filter(filter => filter.mode !== 'select')
                      .map(filter => {
                        const isActive = activeCustomFilters.includes(filter.id);
                        return (
                          <button
                            key={filter.id}
                            onClick={() => {
                              setActiveCustomFilters(prev => 
                                isActive ? prev.filter(id => id !== filter.id) : [...prev, filter.id]
                              );
                            }}
                            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all border ${
                              isActive 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-[1.02]' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-emerald-300 shadow-sm'
                            }`}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!profiles ? (
        <div className="text-center py-12 text-slate-500">Loading profiles...</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 mb-4">No profiles found.</p>
          <Link to="/create" className="text-emerald-600 font-medium hover:text-emerald-700">
            Create a new profile
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map(profile => (
            <motion.div 
              key={profile.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    {profile.profilePicture ? (
                      <img src={profile.profilePicture} alt={profile.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{profile.name}</h3>
                      <p className="text-sm text-slate-500">{profile.cnic}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="bg-emerald-100 text-emerald-800 text-xl font-black px-3 py-1 rounded-lg border border-emerald-200" title="Applicant Score">
                      {profile.score || 0}
                    </div>
                    {((profile.donations?.length || 0) > 0) && (
                      <div className="bg-amber-100 text-amber-800 text-sm font-bold px-2 py-0.5 rounded-md border border-amber-200 flex items-center" title="Total Donations Received">
                        <Heart className="w-3 h-3 mr-1 text-amber-600 fill-amber-600" />
                        PKR {profile.donations?.reduce((sum, don) => sum + don.amount, 0) || 0}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium">App No:</span> {profile.applicationNumber}</p>
                  <p><span className="font-medium">District:</span> {profile.district}</p>
                  <p className="text-xs text-slate-400 mt-4">
                    Added: {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                <div className="flex space-x-4">
                  <Link 
                    to={`/profiles/${profile.id}`}
                    className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Link>
                  <button
                    onClick={() => setDonationModalProfile(profile)}
                    className="text-rose-600 hover:text-rose-700 font-medium text-sm flex items-center"
                  >
                    <Heart className="w-4 h-4 mr-1" /> {role === 'admin' ? 'Donate' : 'Donations'}
                  </button>
                </div>
                {role === 'admin' && (
                  <div className="flex space-x-3">
                    <Link 
                      to={`/edit/${profile.id}`}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(profile.id!)}
                      className={`transition-colors flex items-center ${deletingId === profile.id ? 'text-white bg-red-600 px-2 py-1 rounded text-xs font-bold' : 'text-red-600 hover:text-red-700'}`}
                    >
                      {deletingId === profile.id ? 'Confirm' : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Donation Modal */}
      <AnimatePresence>
        {donationModalProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-rose-500" />
                  Donations for {donationModalProfile.name}
                </h3>
                <button
                  onClick={() => setDonationModalProfile(null)}
                  className="text-slate-400 hover:text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {/* Existing Donations List */}
                <div className="space-y-4 mb-8">
                  <h4 className="font-semibold text-slate-800">Donation History</h4>
                  {(!donationModalProfile.donations || donationModalProfile.donations.length === 0) ? (
                    <p className="text-sm text-slate-500 italic">No donations recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {donationModalProfile.donations.map(don => (
                        <div key={don.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-800">{don.donorName}</span>
                            <span className="font-bold text-emerald-600">PKR {don.amount}</span>
                          </div>
                          {don.description && <p className="text-sm text-slate-600 mt-1">{don.description}</p>}
                          <p className="text-xs text-slate-400 mt-2">{new Date(don.date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Donation Form (Admin Only) */}
                {role === 'admin' && (
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="font-semibold text-slate-800 mb-4">Record New Donation</h4>
                    <form onSubmit={handleAddDonation} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Donor Name</label>
                        <input
                          type="text"
                          required
                          list="donor-names"
                          value={newDonation.donorName}
                          onChange={e => setNewDonation({ ...newDonation, donorName: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Name of the donor"
                        />
                        <datalist id="donor-names">
                          {settings?.donors?.map((donor, idx) => (
                            <option key={idx} value={donor.name} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={newDonation.amount}
                          onChange={e => setNewDonation({ ...newDonation, amount: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Amount donated"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                        <textarea
                          value={newDonation.description}
                          onChange={e => setNewDonation({ ...newDonation, description: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="Any additional details"
                          rows={2}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSavingDonation}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                      >
                        {isSavingDonation ? 'Saving...' : 'Record Donation'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
