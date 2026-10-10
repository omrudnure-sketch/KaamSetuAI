import React, { useState, useEffect } from 'react';
import { getWorkerPayments, getWorkerEarningsSummary } from '../services/paymentService.js';
import { workerProjectTranslations } from '../utils/workerProjectTranslations.js';
import { useAuth } from '../context/AuthContext.jsx';

const WorkerEarningsPage = () => {
  const { user } = useAuth();
  const [lang, setLang] = useState('en');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = workerProjectTranslations[lang] || workerProjectTranslations.en;

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sumRes, payRes] = await Promise.all([
        getWorkerEarningsSummary(),
        getWorkerPayments(),
      ]);
      setSummary(sumRes.data);
      setPayments(payRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header & Language Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.payments}</h1>
          <p className="text-gray-600 text-sm mt-1">{t.myProjectsSubtitle}</p>
        </div>
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              lang === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('mr')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              lang === 'mr' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            मराठी
          </button>
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              lang === 'hi' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.totalEarnings}</span>
              <p className="text-2xl font-extrabold text-indigo-600 mt-2">
                ₹{(summary?.totalEarnings || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.thisMonth}</span>
              <p className="text-2xl font-extrabold text-green-600 mt-2">
                ₹{(summary?.thisMonth || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.thisWeek}</span>
              <p className="text-2xl font-extrabold text-blue-600 mt-2">
                ₹{(summary?.thisWeek || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.pendingAmount}</span>
              <p className="text-2xl font-extrabold text-amber-600 mt-2">
                ₹{(summary?.pending || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Payment Records List */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">{t.paymentHistory}</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                {payments.length} Records
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{t.noPayments}</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <div key={p._id} className="p-5 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-base">
                          {p.projectId?.name || 'Project Payment'}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          p.status === 'recorded' ? 'bg-green-100 text-green-800' :
                          p.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          p.status === 'disputed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Date: {new Date(p.paymentDate).toLocaleDateString()}</span>
                        <span>Type: <strong className="capitalize">{p.type}</strong></span>
                        <span>Method: <strong className="uppercase">{p.method}</strong></span>
                        {p.reference && <span>Ref: {p.reference}</span>}
                      </div>
                      {p.notes && (
                        <p className="text-xs text-gray-600 italic mt-1.5 bg-gray-50 p-2 rounded border border-gray-100">
                          "{p.notes}"
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-gray-900">
                        ₹{p.amount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkerEarningsPage;
