import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// ✅ Import from the Repository Facade
import { listPeople } from "../../data/People/People.Repository"; 
import "../../styles/DetailPageLayout.css";
import "../../styles/Register.css";

const PeopleTable = ({ orgId, filter: propFilter, qualifications = [], expiredPeopleIds = [] }) => {
    const [peopleList, setPeopleList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [filter, setFilter] = useState(propFilter || "");
    
    const todayStr = new Date().toISOString().slice(0, 10);

    // --- Helper Functions ---
    function isExpiredQualification(qual, today) {
        if (!qual || !qual.renewal) return false;
        return qual.renewal < today;
    }

    function getNextRenewal(quals) {
        if (!quals || !quals.length) return null;
        const sorted = [...quals].sort((a, b) => (a.renewal || '').localeCompare(b.renewal || ''));
        return sorted[0]?.renewal || null;
    }

    // --- Data Loading & Dashboard Sync ---
    useEffect(() => {
        if (!orgId) return;
        let alive = true;
        setIsLoading(true);

        // Sync local filter state with the incoming dashboard drill-down state
        if (location.state?.initialFilter) {
            setFilter(location.state.initialFilter);
        }

        listPeople({ orgId, limit: 1000 })
            .then(data => {
                if (alive) setPeopleList(data.rows || []);
            })
            .catch((err) => {
                if (alive) setError(err.message || "Failed to fetch people.");
            })
            .finally(() => {
                if (alive) setIsLoading(false);
            });

        return () => { alive = false; };
    }, [orgId, location.state]);

    // --- Data Mapping: Group Quals by Person (Memoized for Performance) ---
    const qualsByPerson = useMemo(() => {
        const mapping = {};
        qualifications.forEach(q => {
            if (q.personId) {
                if (!mapping[q.personId]) mapping[q.personId] = [];
                mapping[q.personId].push(q);
            }
        });
        return mapping;
    }, [qualifications]);

    // --- Centralized Filtering Logic ---
    const filteredPeople = useMemo(() => {
        let filteredData = [...peopleList];
        const activeFilter = filter?.trim();

        if (activeFilter === 'Expired' || activeFilter === 'expired') {
            filteredData = peopleList.filter(p => expiredPeopleIds.includes(p.id || p._id));
        } else if (activeFilter === 'Valid') {
            filteredData = peopleList.filter(p => !expiredPeopleIds.includes(p.id || p._id));
        } else if (activeFilter) {
            filteredData = peopleList.filter(p => (p.employeeType || '').trim() === activeFilter);
        }
        
        return filteredData;
    }, [peopleList, filter, expiredPeopleIds]);

    if (isLoading) return <div className="panel">Loading workforce data...</div>;
    if (error) return <div className="panel errorText">{error}</div>;

    return (
        <div className="registerTableWrap">
            {filter && (
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                        background: filter === 'Valid' ? '#e6ffe6' : filter === 'Expired' ? '#ffeaea' : '#e0f7fa',
                        color: filter === 'Valid' ? '#009e2c' : filter === 'Expired' ? '#ff3b47' : '#007b8a',
                        borderRadius: 8,
                        fontSize: 13,
                        padding: '2px 10px',
                        fontWeight: 600
                    }}>
                        Filter Active: {filter}
                    </span>
                    <button 
                        className="btn-electric btnGhost"
                        style={{ color: '#ff3b47', fontWeight: 700, fontSize: 13, height: 30, padding: '0 12px' }} 
                        onClick={() => setFilter("")}
                    >
                        <span>✕ Clear Filter</span>
                    </button>
                </div>
            )}
            
            <table className="registerTable">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Account</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Staff Level</th>
                        <th>Employment Type</th>
                        <th>Next Renewal</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPeople.length === 0 ? (
                        <tr>
                            <td className="registerEmpty" colSpan={8}>
                                {filter ? `No ${filter} staff found.` : 'No personnel found.'}
                            </td>
                        </tr>
                    ) : (
                        filteredPeople.map(person => {
                            const personId = person.id || person._id;
                            const personQuals = qualsByPerson[personId] || [];
                            const expiredQuals = personQuals.filter(q => isExpiredQualification(q, todayStr));
                            const hasExpired = expiredQuals.length > 0;
                            const soonestRenewal = getNextRenewal(personQuals);
                            
                            const renewalColor = hasExpired ? '#ff3b47' : 'inherit';
                            const renewalWeight = hasExpired ? 700 : 400;

                            return (
                                <tr key={personId} className={`registerRow${hasExpired ? ' expired-row' : ''}`}>
                                    <td className="registerStrong">
                                        <span
                                            style={{ color: "var(--primary)", cursor: "pointer" }}
                                            onClick={() => navigate(`/peporg/${orgId}/people/${encodeURIComponent(person.email || personId)}`)}
                                        >
                                            {person.displayName || person.name || `${person.firstName || ''} ${person.lastName || ''}`}
                                            {hasExpired && (
                                                <span style={{ color: '#ff3b47', marginLeft: 6 }} title="Expired Quals">
                                                    ⚠️
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td>{person.account || person.username || "-"}</td>
                                    <td>{person.email || "-"}</td>
                                    <td>{person.department || "-"}</td>
                                    <td>{person.staffLevel || "-"}</td>
                                    <td>{person.employeeType || "-"}</td>
                                    <td style={{ color: renewalColor, fontWeight: renewalWeight }}>
                                        {soonestRenewal || "-"}
                                    </td>
                                    <td>
                                        <span className={`registerPill registerPill--${person.status?.toLowerCase() === 'active' ? 'good' : 'neutral'}`}>
                                            {person.status || "Active"}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PeopleTable;