import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// ✅ Import from the Repository Facade instead of the old API
import { listPeople } from "../../data/People/People.Repository"; 
import "../../styles/DetailPageLayout.css";
import "../../styles/Register.css";

const PeopleTable = ({ orgId }) => {
    const [peopleList, setPeopleList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!orgId) return;
        
        let alive = true;
        setIsLoading(true);
        setError(null);

        // ✅ Use the new Repository method
        // listPeople returns { rows, total, etc. }
        listPeople({ orgId, limit: 1000 })
            .then(data => {
                if (alive) {
                    // Extract the rows from the paged result
                    setPeopleList(data.rows || []);
                }
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
                        <th>Title</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {peopleList.length === 0 ? (
                        <tr>
                            <td className="registerEmpty" colSpan={7}>
                                No people registered for this organisation.
                            </td>
                        </tr>
                    ) : (
                        peopleList.map(person => (
                            // ✅ Use person.id (canonical) or person._id (legacy)
                            <tr key={person.id || person._id} className="registerRow">
                                <td className="registerStrong">
                                    <span
                                        style={{ color: "var(--primary)", textDecoration: "none", cursor: "pointer" }}
                                        onClick={() => {
                                            // ✅ Encode the email for the URL lookup
                                            const identifier = encodeURIComponent(person.email || person.id || person._id);
                                            navigate(`/peporg/${orgId}/people/${identifier}`);
                                        }}
                                        onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                                    >
                                        {person.displayName || person.name || `${person.firstName || ''} ${person.lastName || ''}`}
                                    </span>
                                </td>
                                <td>{person.account || person.username || "—"}</td>
                                <td>{person.email || "—"}</td>
                                <td>{person.department || "—"}</td>
                                <td>{person.staffLevel || "—"}</td>
                                <td>{person.title || person.jobTitle || "—"}</td>
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
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PeopleTable;