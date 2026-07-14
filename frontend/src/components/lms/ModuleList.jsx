import React, { useState } from 'react';
import { ChevronDown, ChevronRight, PlayCircle, CheckCircle, Lock } from 'lucide-react';

const ModuleList = ({ modules, selectedLesson, onLessonSelect, enrollment, isFree, isAdmin }) => {
  const [expandedModules, setExpandedModules] = useState({});

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const isLessonCompleted = (lessonId) => {
    return enrollment?.completedLessons?.includes(lessonId);
  };

  const isLessonLocked = (lesson) => {
    // If course is free or user is admin, nothing is locked
    if (isFree || isAdmin) return false;
    
    // Check if individual lesson is free or user is enrolled
    if (lesson.isFree) return false;
    if (!enrollment) return true;
    
    // Check if user has paid for the course
    if (enrollment.paymentStatus !== 'paid' && enrollment.paymentStatus !== 'free') {
      return true;
    }
    
    return false;
  };

  const getModuleDuration = (module) => {
    if (!module.lessons || module.lessons.length === 0) return '0 min';
    
    const totalSeconds = module.lessons.reduce((total, lesson) => 
      total + (lesson.videoDuration || 0), 0
    );
    
    const minutes = Math.round(totalSeconds / 60);
    return `${minutes} min`;
  };

  const getCompletedLessonsInModule = (module) => {
    if (!module.lessons || !enrollment?.completedLessons) return 0;
    
    return module.lessons.filter(lesson => 
      enrollment.completedLessons.includes(lesson._id)
    ).length;
  };

  return (
    <div className="space-y-2">
      {modules.map((module) => {
        const isExpanded = expandedModules[module._id] !== false; // Default to expanded
        const completedLessons = getCompletedLessonsInModule(module);
        const totalLessons = module.lessons?.length || 0;
        const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return (
          <div key={module._id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Module Header */}
            <div 
              className="bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleModule(module._id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 mr-2" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 mr-2" />
                  )}
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {module.title}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <span>{totalLessons} lessons</span>
                      <span className="mx-2">•</span>
                      <span>{getModuleDuration(module)}</span>
                      {completedLessons > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-green-600 font-medium">
                            {completedLessons}/{totalLessons} completed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Progress Indicator */}
                {completedLessons > 0 && (
                  <div className="flex items-center">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {progress}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Lessons List */}
            {isExpanded && module.lessons && module.lessons.length > 0 && (
              <div className="divide-y divide-gray-100">
                {module.lessons.map((lesson, index) => {
                  const isSelected = selectedLesson?._id === lesson._id;
                  const isCompleted = isLessonCompleted(lesson._id);
                  const isLocked = isLessonLocked(lesson);
                  
                  return (
                    <div
                      key={lesson._id}
                      className={`px-4 py-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => !isLocked && onLessonSelect(lesson)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3">
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-gray-400" />
                            ) : isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <PlayCircle className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center">
                              <span className={`font-medium ${
                                isSelected ? 'text-blue-700' : 'text-gray-900'
                              }`}>
                                {index + 1}. {lesson.title}
                              </span>
                              
                              {lesson.isFree && !isLocked && (
                                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                                  Free
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <span>{Math.round((lesson.videoDuration || 0) / 60)} min</span>
                              {isCompleted && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-green-600 font-medium">Completed</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Lock/Preview Indicator */}
                        {isLocked && (
                          <span className="text-xs text-gray-500 font-medium">
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Empty State */}
            {isExpanded && (!module.lessons || module.lessons.length === 0) && (
              <div className="px-4 py-6 text-center">
                <div className="text-gray-400 mb-2">
                  <PlayCircle className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-sm text-gray-500">
                  No lessons available in this module
                </p>
              </div>
            )}
          </div>
        );
      })}
      
      {/* No Modules State */}
      {modules.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-3">
            <PlayCircle className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No modules available
          </h3>
          <p className="text-gray-600">
            This course doesn't have any learning modules yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default ModuleList;