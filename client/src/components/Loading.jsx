import React from 'react'

export const ScanningLoader = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
      <div className="relative w-24 h-24 mb-8">
        {/* Radar Rings */}
        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full animate-[ping_3s_linear_infinite]"></div>
        <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-[ping_3s_linear_infinite_1s]"></div>
        
        {/* Core Icon */}
        <div className="absolute inset-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center z-10">
          <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>

        {/* Orbiting Dot */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="h-3 w-3 bg-rose-500 rounded-full absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 shadow-md"></div>
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-700 mb-1">{text}</h3>
        <div className="flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
        </div>
      </div>
    </div>
  )
}

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-4 bg-slate-100 rounded w-24 animate-pulse"></div>
        ))}
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse"></div>
              <div className="h-3 bg-slate-50 rounded w-1/4 animate-pulse"></div>
            </div>
            <div className="w-20 h-6 bg-slate-100 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const CardSkeleton = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-64 flex flex-col justify-between animate-pulse">
          <div className="flex justify-between">
            <div className="h-4 bg-slate-100 rounded w-1/3"></div>
            <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="space-y-3">
            <div className="h-2 bg-slate-50 rounded w-full"></div>
            <div className="h-2 bg-slate-50 rounded w-5/6"></div>
            <div className="h-2 bg-slate-50 rounded w-4/6"></div>
          </div>
          <div className="h-10 bg-slate-100 rounded-lg w-full mt-4"></div>
        </div>
      ))}
    </div>
  )
}
