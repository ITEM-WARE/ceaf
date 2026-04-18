import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Profile } from '../db';
import { calculateScore } from '../scoring';
import { useProfile, useSettings, addProfile, updateProfile } from '../hooks/useFirebase';
import { motion, AnimatePresence } from 'motion/react';
import { Save, ArrowLeft, Upload, X, AlertCircle } from 'lucide-react';
import { compressImage } from '../utils/image';

export function ProfileForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<Profile>({
    defaultValues: {
      answers: {},
      conditionalAnswers: {}
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settings = useSettings();
  const profile = useProfile(id);

  useEffect(() => {
    if (isEditing) {
      if (profile === null) {
        navigate('/profiles');
      } else if (profile && settings) {
        // Migrate old profile data to new format for the form
        const migratedProfile = { ...profile };
        if (!migratedProfile.answers) {
          migratedProfile.answers = {};
        }
        if (!migratedProfile.conditionalAnswers) {
          migratedProfile.conditionalAnswers = {};
        }

        settings.questions.forEach(q => {
          if (migratedProfile.answers[q.id] === undefined && (migratedProfile as any)[q.id] !== undefined) {
            migratedProfile.answers[q.id] = (migratedProfile as any)[q.id];
          }
          
          if (migratedProfile.conditionalAnswers[q.id] === undefined) {
            if (q.id === 'governmentSupport' && (migratedProfile as any).governmentSupportAmount !== undefined) {
              migratedProfile.conditionalAnswers[q.id] = (migratedProfile as any).governmentSupportAmount;
            }
            if (q.id === 'externalSupport' && (migratedProfile as any).externalSupportAmount !== undefined) {
              migratedProfile.conditionalAnswers[q.id] = (migratedProfile as any).externalSupportAmount;
            }
            if (q.id === 'debtForBasicNeeds' && (migratedProfile as any).debtAmount !== undefined) {
              migratedProfile.conditionalAnswers[q.id] = (migratedProfile as any).debtAmount;
            }
            if (q.id === 'disabilityInHousehold' && (migratedProfile as any).disabilityType !== undefined) {
              migratedProfile.conditionalAnswers[q.id] = (migratedProfile as any).disabilityType;
            }
            if (q.id === 'houseStatus' && (migratedProfile as any).rentAmount !== undefined) {
              migratedProfile.conditionalAnswers[q.id] = (migratedProfile as any).rentAmount;
            }
          }
        });

        reset(migratedProfile);
        if (profile.profilePicture) {
          setProfilePicPreview(profile.profilePicture);
        }
      }
    }
  }, [profile, settings, isEditing, reset, navigate]);

  const watchAnswers = watch('answers') || {};
  const watchAnswersString = JSON.stringify(watchAnswers);

  // Effect to clear dependent answers when parent question changes
  useEffect(() => {
    if (!settings?.questions) return;

    let changed = false;
    settings.questions.forEach(q => {
      if (q.dependsOnQuestionId && q.dependsOnAnswer) {
        const parentAnswer = watchAnswers[q.dependsOnQuestionId];
        if (parentAnswer !== undefined && String(parentAnswer) !== String(q.dependsOnAnswer)) {
          // If the dependency is not met, clear the answer for this question
          if (watchAnswers[q.id] !== undefined) {
            setValue(`answers.${q.id}`, undefined);
            setValue(`conditionalAnswers.${q.id}`, undefined);
            changed = true;
          }
        }
      }
    });
    
    // No need to do anything if nothing changed, 
    // and setValue will trigger a re-render anyway.
  }, [watchAnswersString, settings?.questions, setValue]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 400, 400, 0.8);
        setProfilePicPreview(compressedBase64);
        setValue('profilePicture', compressedBase64);
      } catch (error) {
        console.error('Error compressing image:', error);
        setErrorMsg('Failed to process image. Please try a different one.');
        setTimeout(() => setErrorMsg(null), 3000);
      }
    }
  };

  const removeImage = () => {
    setProfilePicPreview(null);
    setValue('profilePicture', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: Profile) => {
    if (!settings) return;
    setIsSaving(true);

    try {
      const { score, breakdown } = calculateScore(data, settings);
      
      // Convert answers and conditionalAnswers to plain objects.
      // react-hook-form might create arrays if the question IDs are numeric strings (like Date.now()).
      // Firestore strips non-index properties from arrays, so we must convert them to plain objects.
      const plainAnswers = Array.isArray(data.answers) ? Object.assign({}, data.answers) : { ...data.answers };
      const plainConditionalAnswers = Array.isArray(data.conditionalAnswers) ? Object.assign({}, data.conditionalAnswers) : { ...data.conditionalAnswers };

      // Remove undefined/null values
      Object.keys(plainAnswers).forEach(key => {
        if (plainAnswers[key] === undefined || plainAnswers[key] === null) {
          delete plainAnswers[key];
        }
      });
      Object.keys(plainConditionalAnswers).forEach(key => {
        if (plainConditionalAnswers[key] === undefined || plainConditionalAnswers[key] === null) {
          delete plainConditionalAnswers[key];
        }
      });

      const profileToSave: any = {
        ...data,
        answers: plainAnswers,
        conditionalAnswers: plainConditionalAnswers,
        score,
        scoreBreakdown: breakdown,
        updatedAt: Date.now(),
      };

      // Remove any undefined values from the root object
      Object.keys(profileToSave).forEach(key => {
        if (profileToSave[key] === undefined) {
          delete profileToSave[key];
        }
      });

      if (isEditing && id) {
        await updateProfile(id, profileToSave);
      } else {
        profileToSave.createdAt = Date.now();
        await addProfile(profileToSave as Omit<Profile, 'id'>);
      }

      navigate('/profiles');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrorMsg('Failed to save profile. Please try again.');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <>
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center space-x-3 bg-red-50 text-red-800 border border-red-200"
          >
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="font-medium">{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-600"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            {isEditing ? 'Edit Profile' : 'Create New Profile'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
        
        {/* Section 1: Basic Information */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-semibold text-slate-800">Section 1: Basic Information</h2>
            <p className="text-sm text-slate-500">This information is stored but does not affect the applicant score.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Application Number</label>
              <input 
                {...register('applicationNumber', { required: 'Required' })} 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="Unique ID"
              />
              {errors.applicationNumber && <p className="text-red-500 text-xs mt-1">{errors.applicationNumber.message}</p>}
            </div>

            <div className="md:col-span-2 flex items-center space-x-6 mb-4">
              <div className="flex-shrink-0">
                {profilePicPreview ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200">
                    <img src={profilePicPreview} alt="Profile Preview" className="w-full h-full rounded-full object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    <Upload className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">Optional. Max size 1MB recommended.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
              <input 
                {...register('district', { required: 'Required' })} 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input 
                {...register('name', { required: 'Required' })} 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Father/Husband Name</label>
              <input 
                {...register('fatherName', { required: 'Required' })} 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              {errors.fatherName && <p className="text-red-500 text-xs mt-1">{errors.fatherName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNIC</label>
              <input 
                {...register('cnic', { required: 'Required' })} 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="00000-0000000-0"
              />
              {errors.cnic && <p className="text-red-500 text-xs mt-1">{errors.cnic.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input 
                {...register('phoneNumber', { required: 'Required' })} 
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea 
                {...register('address', { required: 'Required' })} 
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">What type of support would help this family sustain their livelihood and earn enough to cover their daily expenses?</label>
              <textarea 
                {...register('supportToSustainLivelihood')} 
                rows={3}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="Optional"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Comments / Summary</label>
              <textarea 
                {...register('comments')} 
                rows={4}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="Optional notes about the applicant..."
              />
            </div>
          </div>
        </section>

        {/* Section 2: Scored Questions (Dynamic) */}
        <section className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl font-semibold text-slate-800">Section 2: Scored Questions</h2>
            <p className="text-sm text-slate-500">These fields contribute to the Applicant Score.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settings.questions?.map((q) => {
              // Check if this question depends on another
              if (q.dependsOnQuestionId && q.dependsOnAnswer) {
                const parentAnswer = watchAnswers[q.dependsOnQuestionId];
                if (String(parentAnswer) !== String(q.dependsOnAnswer)) {
                  return null; // Don't render if condition is not met
                }
              }

              const currentAnswer = watchAnswers[q.id];
              const showConditional = q.hasConditionalField && currentAnswer === q.conditionalTrigger;

              return (
                <div key={q.id} className={showConditional ? "space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100" : ""}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{q.text}</label>
                    {q.type === 'boolean' ? (
                      <select 
                        {...register(`answers.${q.id}`, { required: 'Required' })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                      >
                        <option value="">Select...</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : q.type === 'range' ? (
                      <input 
                        type="number"
                        {...register(`answers.${q.id}`, { required: 'Required', valueAsNumber: true })}
                        placeholder="Enter exact value"
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                    ) : (
                      <select 
                        {...register(`answers.${q.id}`, { required: 'Required' })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                      >
                        <option value="">Select...</option>
                        {q.options?.map((opt, i) => (
                          <option key={i} value={opt.label}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    {errors.answers?.[q.id] && <p className="text-red-500 text-xs mt-1">{errors.answers[q.id]?.message as string}</p>}
                  </div>
                  
                  {q.followUps && (
                    <FollowUpRenderer 
                      configs={q.followUps} 
                      parentAnswer={watch(`answers.${q.id}`)} 
                      register={register}
                      watch={watch}
                      errors={errors}
                    />
                  )}
                  
                  {showConditional && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{q.conditionalLabel}</label>
                      <input 
                        type={q.conditionalType === 'number' ? 'number' : 'text'}
                        {...register(`conditionalAnswers.${q.id}`, { required: 'Required' })} 
                        className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      />
                      {errors.conditionalAnswers?.[q.id] && <p className="text-red-500 text-xs mt-1">{errors.conditionalAnswers[q.id]?.message as string}</p>}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="pt-6 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

      </form>
    </motion.div>
    </>
  );
}

function FollowUpRenderer({ configs, parentAnswer, register, watch, errors }: { configs: any[], parentAnswer: any, register: any, watch: any, errors: any }) {
  return (
    <div className="space-y-4">
      {configs.map(fu => {
        if (String(parentAnswer) !== String(fu.triggerValue)) return null;

        return (
          <motion.div 
            key={fu.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pl-4 border-l-2 border-emerald-200 space-y-3 mt-3"
          >
            <label className="block text-sm font-medium text-slate-600">{fu.label}</label>
            
            {fu.type === 'boolean' ? (
              <select 
                {...register(`conditionalAnswers.${fu.id}`, { required: 'Required' })}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
              >
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            ) : fu.type === 'range' ? (
              <input 
                type="number"
                {...register(`conditionalAnswers.${fu.id}`, { required: 'Required', valueAsNumber: true })}
                placeholder="Enter exact value"
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            ) : fu.type === 'select' ? (
              <select 
                {...register(`conditionalAnswers.${fu.id}`, { required: 'Required' })}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
              >
                <option value="">Select...</option>
                {fu.options?.map((opt: any, i: number) => (
                  <option key={i} value={opt.label}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input 
                type={fu.type || 'text'}
                {...register(`conditionalAnswers.${fu.id}`, { required: 'Required' })}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            )}
            
            {errors.conditionalAnswers?.[fu.id] && <p className="text-red-500 text-xs mt-1">{errors.conditionalAnswers[fu.id]?.message as string}</p>}

            {/* Recursive nesting */}
            {fu.followUps && (
              <FollowUpRenderer 
                configs={fu.followUps} 
                parentAnswer={watch(`conditionalAnswers.${fu.id}`)} 
                register={register}
                watch={watch}
                errors={errors}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
