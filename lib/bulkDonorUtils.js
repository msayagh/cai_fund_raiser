/**
 * Bulk donor operations utilities
 */

export function donorsToCSV(donors) {
    const headers = ['Name', 'Email', 'Pledged', 'Paid', 'Status'];
    const rows = donors.map((donor) => [
        donor.name || '',
        donor.email || '',
        donor.engagement?.totalPledge || 0,
        donor.paidAmount || 0,
        donor.isActive !== false ? 'Active' : 'Inactive',
    ]);

    const csv = [
        headers.join(','),
        ...rows.map((row) =>
            row.map((cell) => {
                const str = String(cell);
                // Escape quotes and wrap in quotes if contains comma
                return str.includes(',') || str.includes('"')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(',')
        ),
    ].join('\n');

    return csv;
}

export function downloadCSV(csv, filename = 'donors.csv') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
    }

    // Parse headers
    const headers = lines[0]
        .split(',')
        .map((h) => h.trim().toLowerCase());

    // Validate required headers
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');

    if (nameIdx === -1 || emailIdx === -1) {
        throw new Error('CSV must contain "Name" and "Email" columns');
    }

    // Parse rows
    const donors = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parsing (doesn't handle complex quoted fields perfectly)
        const cells = line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));

        if (cells.length < 2) continue;

        const donor = {
            name: cells[nameIdx] || '',
            email: cells[emailIdx] || '',
        };

        // Optional: pledge
        const pledgeIdx = headers.indexOf('pledge');
        if (pledgeIdx !== -1 && cells[pledgeIdx]) {
            donor.pledge = Number(cells[pledgeIdx]) || 0;
        }

        if (donor.name && donor.email) {
            donors.push(donor);
        }
    }

    return donors;
}

export function validateDonors(donors) {
    const errors = [];

    donors.forEach((donor, idx) => {
        if (!donor.name?.trim()) {
            errors.push(`Row ${idx + 2}: Name is required`);
        }
        if (!donor.email?.trim()) {
            errors.push(`Row ${idx + 2}: Email is required`);
        } else if (!isValidEmail(donor.email)) {
            errors.push(`Row ${idx + 2}: Invalid email format`);
        }
        if (donor.pledge !== undefined && (isNaN(donor.pledge) || donor.pledge < 0)) {
            errors.push(`Row ${idx + 2}: Pledge must be a positive number`);
        }
    });

    return errors;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
