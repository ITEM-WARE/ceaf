import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Settings as SettingsType, defaultQuestions } from '../db';
import { useSettings, updateSettings } from '../hooks/useFirebase';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Settings as SettingsIcon, Plus, Trash2, ArrowUp, ArrowDown, Upload, X, HelpCircle, ChevronDown, ChevronUp, RotateCcw, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { compressImage } from '../utils/image';

function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1 align-middle">
      <HelpCircle className="w-4 h-4 text-slate-400 hover:text-emerald-500 cursor-help transition-colors" />
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 opacity-0 transition-opacity group-hover:opacity-100 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl z-50 text-center">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
}

function QuestionCard({ index, field, control, register, watch, remove, move, isFirst, isLast, fields }: any) {
  const [isExpanded, setIsExpanded] = useState(field.text === 'New Question');
  
  const questionType = watch(`questions.${index}.type`);
  const hasConditional = watch(`questions.${index}.hasConditionalField`);
  const questionText = watch(`questions.${index}.text`) || 'Unnamed Question';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="flex flex-col space-y-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); move(index, index - 1); }}
              disabled={isFirst}
              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); move(index, index + 1); }}
              disabled={isLast}
              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
          <div>
            <span className="font-semibold text-slate-800 text-lg">{index + 1}. {questionText}</span>
            <div className="flex items-center mt-1 space-x-2">
              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                {questionType === 'boolean' ? 'Yes/No' : questionType === 'range' ? 'Numeric Range' : 'Multiple Choice'}
              </span>
              {hasConditional && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  Has Follow-up
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(index); }}
            className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
            title="Delete Question"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="p-2 text-slate-400">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-6 space-y-8 bg-white">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Question Text
                <InfoTooltip text="The actual question that will be asked to the applicant." />
              </label>
              <input
                type="text"
                {...register(`questions.${index}.text` as const, { required: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input type="hidden" {...register(`questions.${index}.id` as const)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Answer Type
                <InfoTooltip text="Choose whether the applicant answers with a simple Yes/No or selects from multiple options." />
              </label>
              <select
                {...register(`questions.${index}.type` as const)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="boolean">Yes/No (Boolean)</option>
                <option value="select">Multiple Choice (Select)</option>
                <option value="range">Numeric Range (Automatic Score)</option>
              </select>
            </div>
          </div>
          
          {/* Scoring Settings */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
              Scoring Rules
              <InfoTooltip text="Define how many points are added to the applicant's score based on their answer." />
            </h4>
            
            {questionType === 'boolean' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Score if Answer is "Yes"</label>
                <input
                  type="number"
                  {...register(`questions.${index}.scoreIfTrue` as const, { valueAsNumber: true })}
                  className="w-32 px-4 py-2 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            ) : (
              <OptionsEditor control={control} register={register} questionIndex={index} type={questionType} />
            )}
          </div>

          {/* Advanced Logic */}
          <div className="space-y-6 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center">
              Advanced Logic
              <InfoTooltip text="Set up conditional follow-up fields or make this question depend on a previous answer." />
            </h4>

            {/* Conditional Follow-up */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`conditional-${index}`}
                  {...register(`questions.${index}.hasConditionalField` as const)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                />
                <label htmlFor={`conditional-${index}`} className="ml-2 block text-sm font-medium text-slate-700">
                  Add an inline follow-up field
                  <InfoTooltip text="Ask for more details (like an amount or description) if they choose a specific answer." />
                </label>
              </div>

              {hasConditional && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Show when answer is
                      <InfoTooltip text="The exact answer that triggers this follow-up field (e.g., 'Yes' or 'Option A')." />
                    </label>
                    <input
                      type="text"
                      {...register(`questions.${index}.conditionalTrigger` as const)}
                      placeholder="e.g., Yes"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Field Label
                      <InfoTooltip text="The label for the follow-up input box." />
                    </label>
                    <input
                      type="text"
                      {...register(`questions.${index}.conditionalLabel` as const)}
                      placeholder="e.g., Amount"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Field Type</label>
                    <select
                      {...register(`questions.${index}.conditionalType` as const)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="number">Number</option>
                      <option value="text">Text</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Score
                      <InfoTooltip text="Points awarded if this follow-up is answered." />
                    </label>
                    <input
                      type="number"
                      {...register(`questions.${index}.conditionalScore` as const, { valueAsNumber: true })}
                      placeholder="e.g., 5"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recursive Follow-ups */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <h5 className="text-sm font-semibold text-slate-800 flex items-center">
                Recursive Follow-up Questions
                <InfoTooltip text="Add multiple follow-up questions that can also have their own follow-ups." />
              </h5>
              <FollowUpEditor 
                control={control} 
                register={register} 
                watch={watch}
                namePrefix={`questions.${index}`} 
              />
            </div>

            {/* Question Dependency */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center mb-2">
                <h5 className="text-sm font-medium text-slate-700">Question Dependency</h5>
                <InfoTooltip text="Only show this question if a previous question was answered a certain way." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Depends on Question</label>
                  <select
                    {...register(`questions.${index}.dependsOnQuestionId` as const)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">None (Always show)</option>
                    {fields.slice(0, index).map((prevQ: any, prevIdx: number) => {
                      const logicalId = watch(`questions.${prevIdx}.id`);
                      return (
                        <option key={prevQ.id} value={logicalId}>
                          {watch(`questions.${prevIdx}.text`) || 'Unnamed Question'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Show when answer is
                    <InfoTooltip text="The exact answer to the previous question that will make this question appear." />
                  </label>
                  {(() => {
                    const dependsOnId = watch(`questions.${index}.dependsOnQuestionId`);
                    const parentIdx = fields.findIndex((_, i) => watch(`questions.${i}.id`) === dependsOnId);
                    if (parentIdx !== -1) {
                      const parentType = watch(`questions.${parentIdx}.type`);
                      const parentOptions = watch(`questions.${parentIdx}.options`);
                      
                      if (parentType === 'boolean') {
                        return (
                          <select
                            {...register(`questions.${index}.dependsOnAnswer` as const)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                          >
                            <option value="">Select Answer...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        );
                      } else if (parentType === 'select' && parentOptions) {
                        return (
                          <select
                            {...register(`questions.${index}.dependsOnAnswer` as const)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                          >
                            <option value="">Select Answer...</option>
                            {parentOptions.map((opt: any, i: number) => (
                              <option key={i} value={opt.label}>{opt.label}</option>
                            ))}
                          </select>
                        );
                      }
                    }
                    return (
                      <input
                        type="text"
                        {...register(`questions.${index}.dependsOnAnswer` as const)}
                        placeholder="e.g., Yes"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    );
                  })()}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const settings = useSettings();

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<SettingsType>({
    defaultValues: {
      questions: []
    }
  });
  const { fields, append, remove, move, replace } = useFieldArray({
    control,
    name: "questions"
  });
  const { fields: donorFields, append: appendDonor, remove: removeDonor } = useFieldArray({
    control,
    name: "donors"
  });
  const { fields: adderFields, append: appendAdder, remove: removeAdder } = useFieldArray({
    control,
    name: "adders"
  });
  const { fields: filterFields, append: appendFilter, remove: removeFilter } = useFieldArray({
    control,
    name: "customFilters"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (settings && !isLoadedRef.current) {
      reset({
        ...settings,
        questions: settings.questions || [],
        donors: settings.donors || [],
        adders: settings.adders || [],
        customFilters: settings.customFilters || []
      });
      if (settings.appLogo) {
        setLogoPreview(settings.appLogo);
      }
      isLoadedRef.current = true;
    }
  }, [settings, reset]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 400, 400, 0.8);
        setLogoPreview(compressedBase64);
        setValue('appLogo', compressedBase64);
      } catch (error) {
        console.error('Error compressing image:', error);
        showToast('error', 'Failed to process image. Please try a different one.');
      }
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setValue('appLogo', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const onSubmit = async (data: SettingsType) => {
    setIsSaving(true);
    try {
      // Sanitize data to remove undefined and NaN values before saving to Firestore
      const sanitizeData = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(sanitizeData).filter(v => v !== undefined);
        } else if (obj !== null && typeof obj === 'object') {
          return Object.fromEntries(
            Object.entries(obj)
              .map(([k, v]) => {
                if (typeof v === 'number' && Number.isNaN(v)) return [k, 0];
                return [k, sanitizeData(v)];
              })
              .filter(([_, v]) => v !== undefined)
          );
        }
        return obj;
      };

      const sanitizedData = sanitizeData(data);
      await updateSettings(sanitizedData);
      showToast('success', 'Settings saved successfully. New profiles will use these questions and weights.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('error', 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <>
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center space-x-3 ${
              toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            <p className="font-medium">{toastMessage.text}</p>
          </motion.div>
        )}

        {showRestoreConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 overflow-hidden"
            >
              <div className="flex items-center space-x-4 mb-4 text-amber-600">
                <div className="p-3 bg-amber-100 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Restore Defaults</h3>
              </div>
              <p className="text-slate-600 mb-6">
                Are you sure you want to restore the default questions? This will replace your current list with the default questions.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRestoreConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    replace(defaultQuestions);
                    setShowRestoreConfirm(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm"
                >
                  Restore Defaults
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-8"
      >
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-slate-200 text-slate-700 rounded-2xl">
          <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Form & Scoring Settings</h1>
          <p className="text-slate-500 mt-1">Customize the questions and their point weights for the Applicant Score calculation.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
        
        {/* General Settings */}
        <div className="space-y-6 border-b border-slate-200 pb-8">
          <h3 className="text-xl font-semibold text-slate-800">General Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex items-center space-x-6">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img src={logoPreview} alt="App Logo Preview" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    <Upload className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  App Logo
                  <InfoTooltip text="Upload a logo to display on the home and login pages." />
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  ref={fileInputRef}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">Optional. Max size 1MB recommended.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Admin Password
                <InfoTooltip text="Password required to create, edit, delete profiles, and access these settings." />
              </label>
              <input
                type="text"
                {...register('adminPassword')}
                placeholder="Accessadmin"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500">Default: Accessadmin</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Read-Only Password
                <InfoTooltip text="Password for users who should only be able to view the applicant list and details." />
              </label>
              <input
                type="text"
                {...register('readPassword')}
                placeholder="readaccess"
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500">Default: readaccess</p>
            </div>
          </div>
        </div>

        {/* Donors Settings */}
        <div className="space-y-6 border-b border-slate-200 pb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-800">Donor Accounts</h3>
            <button
              type="button"
              onClick={() => appendDonor({ id: 'donor_' + Date.now().toString(), name: '', password: '' })}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Donor
            </button>
          </div>
          <p className="text-sm text-slate-500">Create accounts for donors. When they log in with their password, they will only see profiles they have donated to.</p>
          
          <div className="space-y-4">
            {donorFields.map((field, index) => (
              <div key={field.id} className="flex items-center space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Donor Name</label>
                  <input
                    type="text"
                    {...register(`donors.${index}.name` as const, { required: true })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                  <input
                    type="text"
                    {...register(`donors.${index}.password` as const, { required: true })}
                    placeholder="Donor's login password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => removeDonor(index)}
                    className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {donorFields.length === 0 && (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-sm">No donor accounts created.</p>
              </div>
            )}
          </div>
        </div>

        {/* Adder Accounts Settings */}
        <div className="space-y-6 border-b border-slate-200 pb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-800">Adder Accounts</h3>
            <button
              type="button"
              onClick={() => appendAdder({ id: 'adder_' + Date.now().toString(), name: '', password: '' })}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Adder
            </button>
          </div>
          <p className="text-sm text-slate-500">Create accounts for staff/helpers. When they log in with their password, they can ONLY add new profiles and view existing ones, but cannot edit or delete anything.</p>
          
          <div className="space-y-4">
            {adderFields.map((field, index) => (
              <div key={field.id} className="flex items-center space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Staff Name</label>
                  <input
                    type="text"
                    {...register(`adders.${index}.name` as const, { required: true })}
                    placeholder="e.g. Sarah Smith"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                  <input
                    type="text"
                    {...register(`adders.${index}.password` as const, { required: true })}
                    placeholder="Staff's login password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => removeAdder(index)}
                    className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {adderFields.length === 0 && (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-sm">No adder accounts created.</p>
              </div>
            )}
          </div>
        </div>

        {/* Custom Filters Settings */}
        <div className="space-y-6 border-b border-slate-200 pb-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-800">Custom Quick Filters</h3>
            <button
              type="button"
              onClick={() => appendFilter({ id: 'fil_' + Date.now().toString(), label: '', questionId: '', mode: 'match', answer: '' })}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Filter Button
            </button>
          </div>
          <p className="text-sm text-slate-500">Create custom filters that appear in the View Profiles section. You can make "Quick Match" buttons or "Selectable Answer" dropdowns.</p>
          
          <div className="space-y-4">
            {filterFields.map((field, index) => {
              const filterMode = watch(`customFilters.${index}.mode`);
              return (
              <div key={field.id} className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Filter Label</label>
                    <input
                      type="text"
                      {...register(`customFilters.${index}.label` as const, { required: true })}
                      placeholder="e.g. Needs Immediate Help"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Filter Mode</label>
                    <select
                      {...register(`customFilters.${index}.mode` as const, { required: true })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="match">Quick Match (Toggle Button)</option>
                      <option value="select">Select Answer (Dropdown)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Based on Question</label>
                    <select
                      {...register(`customFilters.${index}.questionId` as const, { required: true })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="">Select Question...</option>
                      {fields.map((q: any, i: number) => {
                        const logicalId = watch(`questions.${i}.id`);
                        return (
                          <option key={logicalId} value={logicalId}>
                            {watch(`questions.${i}.text`) || 'Unnamed Question'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {filterMode === 'match' && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Target Answer to Match</label>
                      {(() => {
                        const selectedQId = watch(`customFilters.${index}.questionId`);
                        const parentIdx = fields.findIndex((_, i) => watch(`questions.${i}.id`) === selectedQId);
                        if (parentIdx !== -1) {
                          const parentType = watch(`questions.${parentIdx}.type`);
                          const parentOptions = watch(`questions.${parentIdx}.options`);
                          
                          if (parentType === 'boolean') {
                            return (
                              <select
                                {...register(`customFilters.${index}.answer` as const, { required: true })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                              >
                                <option value="">Select Answer...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            );
                          } else if ((parentType === 'select' || parentType === 'range') && parentOptions) {
                            return (
                              <select
                                {...register(`customFilters.${index}.answer` as const, { required: true })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                              >
                                <option value="">Select Answer...</option>
                                {parentOptions.map((opt: any, i: number) => (
                                  <option key={i} value={opt.label}>{opt.label}</option>
                                ))}
                              </select>
                            );
                          }
                        }
                        return (
                          <input
                            type="text"
                            {...register(`customFilters.${index}.answer` as const, { required: true })}
                            placeholder="Exact Answer Match"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => removeFilter(index)}
                    className="inline-flex items-center text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove Filter
                  </button>
                </div>
              </div>
            );
          })}
            {filterFields.length === 0 && (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500 text-sm">No custom quick filters created.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="text-xl font-semibold text-slate-800">Questions</h3>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore Defaults
              </button>
              <button
                type="button"
                onClick={() => append({ 
                  id: 'q_' + Date.now().toString(), 
                  text: 'New Question', 
                  type: 'boolean', 
                  scoreIfTrue: 10,
                  options: [{ label: 'Option 1', score: 0 }, { label: 'Option 2', score: 10 }]
                })}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {fields.map((field, index) => (
              <QuestionCard
                key={field.id}
                index={index}
                field={field}
                control={control}
                register={register}
                watch={watch}
                remove={remove}
                move={move}
                isFirst={index === 0}
                isLast={index === fields.length - 1}
                fields={fields}
              />
            ))}
            {fields.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">No questions configured. Click "Add Question" to start.</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </form>
      </motion.div>
    </>
  );
}

function FollowUpEditor({ control, register, watch, namePrefix, depth = 0 }: { control: any, register: any, watch: any, namePrefix: string, depth?: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${namePrefix}.followUps`
  });

  return (
    <div className={`space-y-4 ${depth > 0 ? 'ml-6 pl-4 border-l-2 border-slate-200' : ''}`}>
      {fields.map((field, index) => {
        const fuType = watch(`${namePrefix}.followUps.${index}.type`);
        
        return (
          <div key={field.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Follow-up #{index + 1}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trigger Value (from parent)</label>
                <input
                  type="text"
                  {...register(`${namePrefix}.followUps.${index}.triggerValue` as const, { required: true })}
                  placeholder="e.g. Yes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question Label</label>
                <input
                  type="text"
                  {...register(`${namePrefix}.followUps.${index}.label` as const, { required: true })}
                  placeholder="e.g. How much?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Answer Type</label>
                <select
                  {...register(`${namePrefix}.followUps.${index}.type` as const)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Yes/No</option>
                  <option value="select">Multiple Choice</option>
                  <option value="range">Numeric Range</option>
                </select>
              </div>
              {fuType === 'boolean' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Score if Yes</label>
                  <input
                    type="number"
                    {...register(`${namePrefix}.followUps.${index}.scoreIfTrue` as const, { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              )}
              {(fuType === 'text' || fuType === 'number') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Score if Answered</label>
                  <input
                    type="number"
                    {...register(`${namePrefix}.followUps.${index}.scoreIfAnswered` as const, { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {(fuType === 'select' || fuType === 'range') && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <OptionsEditor 
                  control={control} 
                  register={register} 
                  questionIndex={-1} 
                  type={fuType}
                  customName={`${namePrefix}.followUps.${index}.options`}
                />
              </div>
            )}

            <div className="pt-2">
              <FollowUpEditor 
                control={control} 
                register={register} 
                watch={watch}
                namePrefix={`${namePrefix}.followUps.${index}`}
                depth={depth + 1}
              />
            </div>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => append({ 
          id: 'fu_' + Date.now().toString() + Math.random().toString(36).substr(2, 5), 
          triggerValue: '', 
          label: '', 
          type: 'text' 
        })}
        className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
      >
        <Plus className="w-3 h-3 mr-1" /> Add Follow-up
      </button>
    </div>
  );
}

function OptionsEditor({ control, register, questionIndex, type, customName }: { control: any, register: any, questionIndex: number, type: 'select' | 'range', customName?: string }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: customName || `questions.${questionIndex}.options`
  });

  return (
    <div className="space-y-3">
      {fields.map((field, optionIndex) => (
        <div key={field.id} className="flex items-center space-x-3">
          <input
            type="text"
            {...register(`${customName || `questions.${questionIndex}.options`}.${optionIndex}.label` as const, { required: true })}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            placeholder={type === 'range' ? "Range Name (e.g. 0-10k)" : "Option Label"}
          />
          {type === 'range' && (
            <>
              <input
                type="number"
                {...register(`${customName || `questions.${questionIndex}.options`}.${optionIndex}.min` as const, { valueAsNumber: true })}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Min"
              />
              <input
                type="number"
                {...register(`${customName || `questions.${questionIndex}.options`}.${optionIndex}.max` as const, { valueAsNumber: true })}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Max"
              />
            </>
          )}
          <input
            type="number"
            {...register(`${customName || `questions.${questionIndex}.options`}.${optionIndex}.score` as const, { valueAsNumber: true })}
            className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-right focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Score"
          />
          <button
            type="button"
            onClick={() => remove(optionIndex)}
            className="p-2 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ label: type === 'range' ? 'New Range' : 'New Option', score: 0 })}
        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
      >
        + Add {type === 'range' ? 'Range' : 'Option'}
      </button>
    </div>
  );
}

