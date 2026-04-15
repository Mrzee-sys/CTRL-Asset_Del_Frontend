import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// ✅ Import from the Repository Facade instead of the old API
import { listPeople } from "../../data/People/People.Repository"; 
import "../../styles/DetailPageLayout.css";
import "../../styles/Register.css";

const PeopleTable = ({ orgId, filter, qualifications = [], expiredPeopleIds = [] }) => {
    const [peopleList, setPeopleList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const todayStr = new Date().toISOString().slice(0, 10);

    function isExpiredQualification(qual, today) {
        if (!qual || !qual.renewal) return false;
        return qual.renewal < today;
    }
    function getNextRenewal(quals, today) {
        if (!quals || !quals.length) return null;
        // Find soonest renewal date (expired or not)
        const sorted = [...quals].sort((a, b) => (a.renewal || '').localeCompare(b.renewal || ''));
        return sorted[0]?.renewal || null;
    }

    useEffect(() => {
        if (!orgId) return;
        let alive = true;
        setIsLoading(true);
        setError(null);
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
    }, [orgId]);

    if (isLoading) return <div className="panel">Loading people...</div>;
    if (error) return <div className="panel errorText">{error}</div>;

    // Map personId to their qualifications
    const qualsByPerson = {};
    qualifications.forEach(q => {
        if (q.personId) {
            if (!qualsByPerson[q.personId]) qualsByPerson[q.personId] = [];
            qualsByPerson[q.personId].push(q);
        }
    });

    // Filtering logic
    let filteredData = peopleList;
    if (filter === 'Expired') {
        filteredData = peopleList.filter(p => expiredPeopleIds.includes(p.id || p._id));
    } else if (filter) {
        filteredData = peopleList.filter(p => (p.employeeType || '').trim() === filter);
    }

    return (
        <div className="registerTableWrap">
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
                    {filteredData.length === 0 ? (
                        <tr>
                            <td className="registerEmpty" colSpan={8}>
                                {filter ? `No ${filter} found.` : 'No people registered for this organisation.'}
                            </td>
                        </tr>
                    ) : (
                        filteredData.map(person => {
                            const personId = person.id || person._id;
                            const personQuals = qualsByPerson[personId] || [];
                            const expiredQuals = personQuals.filter(q => isExpiredQualification(q, todayStr));
                            const hasExpired = expiredQuals.length > 0;
                            const soonestRenewal = getNextRenewal(personQuals, todayStr);
                            return (
                                <tr key={personId} className={`registerRow${hasExpired ? ' expired-row' : ''}`}>
                                    <td className="registerStrong">
                                        <span
                                            style={{ color: "var(--primary)", textDecoration: "none", cursor: "pointer" }}
                                            onClick={() => {
                                                const identifier = encodeURIComponent(person.email || person.id || person._id);
                                                navigate(`/peporg/${orgId}/people/${identifier}`);
                                            }}
                                            onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                                            onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                                        >
                                            {person.displayName || person.name || `${person.firstName || ''} ${person.lastName || ''}`}
                                            {hasExpired && (
                                                <span style={{
                                                    color: '#ff3b47',
                                                    fontWeight: 900,
                                                    fontSize: 18,
                                                    marginLeft: 6,
                                                    verticalAlign: 'middle'
                                                }} title="Has expired qualifications">
                                                    &#9888;
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td>{person.account || person.username || "—"}</td>
                                    <td>{person.email || "—"}</td>
                                    <td>{person.department || "—"}</td>
                                    <td>{person.staffLevel || "—"}</td>
                                    <td>{person.employeeType || "—"}</td>
                                    <td style={{ color: hasExpired ? '#ff3b47' : undefined, fontWeight: hasExpired ? 700 : undefined }}>
                                        {soonestRenewal ? soonestRenewal : "—"}
                                    </td>
                                    <td>
                                        <span className={
                                            person.status === "Active"
                                                ? "registerPill registerPill--good"
                                                : person.status === "Terminated"
                                                ? "registerPill registerPill--bad"
                                                : "registerPill registerPill--neutral"
                                        }>
                                            {person.status || "—"}
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
};

export default PeopleTable;