import http from 'k6/http';
import { check, sleep } from 'k6';
import { b64encode } from 'k6/encoding';

// Constants
const BASE_URL = 'http://34.31.147.175:3002/api/v1';
const defaultHeaders = { 'Content-Type': 'application/json' };

export const options = {
    noVUConnectionReuse: true,
    systemTags: ['iter', 'status', 'method', 'url', 'name', 'check', 'error', 'error_code', 'scenario', 'expected_response'],
    scenarios: {
        fetchProducts: {
            executor: 'per-vu-iterations',
            exec: 'fetchProducts',
            vus: __ENV.fetchProducts_vus || 90,
            iterations: __ENV.fetchProducts_iterations || 2000,
            maxDuration: '60m',
        },
        userLogin: {
            executor: 'per-vu-iterations',
            exec: 'userLogin',
            vus: __ENV.userLogin_vus || 90,
            iterations: __ENV.userLogin_iterations || 2000,
            maxDuration: '60m',
        },
        paginateAndSelectProduct: {
            executor: 'per-vu-iterations',
            exec: 'paginateAndSelectProduct',
            vus: __ENV.viewProductAndPagination_vus || 90,
            iterations: __ENV.viewProductAndPagination_iterations || 1500,
            maxDuration: '60m',
        },
        filterAndSearchCategory: {
            executor: 'per-vu-iterations',
            exec: 'filterAndSearchCategory',
            vus: __ENV.filterAndSearchCategory_vus || 90,
            iterations: __ENV.filterAndSearchCategory_iterations || 1500,
            maxDuration: '60m',
        },
    },
};

function selectRandomElement(data) {
    return data[Math.floor(Math.random() * data.length)];
}

function selectRandomUniqueElements(data, count) {
    const res = [];
    for (let i = 0; i < count * 3; i++) {
        const el = selectRandomElement(data);
        if (res.includes(el)) continue;
        res.push(el);
        if (res.length === count) return res;
    }
    return [];
}

export function fetchProducts() {
    const endpoint = `${BASE_URL}/products`;

    const res = http.get(endpoint);

    // Log the raw response body for debugging
    //console.log(`Response body: ${res.body}`);

    // Check if the response is valid JSON
    const contentType = res.headers['Content-Type'];
    if (!contentType || !contentType.includes('application/json')) {
        //console.error('Expected JSON, but received:', contentType);
    }

    check(res, {
        'Fetch products - status 200': (r) => r.status === 200,
        'Fetch products - non-empty response': (r) => r.body && r.body.trim() !== '',
        'Fetch products - valid JSON': (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (e) {
                //console.error('Error parsing JSON:', e);
                return false;
            }
        },
    });

    // Parse the response and ensure it's an array
    if (res.status === 200) {
        try {
            const data = JSON.parse(res.body);
            check(res, {
                'Fetch products - list returned': (r) => data && Array.isArray(data) && data.length > 0,
            });
        } catch (e) {
            //console.error('Error parsing JSON:', e);
        }
    }

    sleep(0.5); // Simulate a small delay between requests
}



export function userLogin() {
    const endpoint = `${BASE_URL}/auth/login`;

    // Simulate user login
    const loginPayload = JSON.stringify({
        email: `test_user${Math.floor(Math.random() * 100)}@test.com`,
        password: 'password123',
    });
    const res = http.post(endpoint, loginPayload, { headers: defaultHeaders });
    check(res, {
        'Login - status 200': (r) => r.status === 200,
        'Login - token exists': (r) => r.json('token') !== undefined,
    });
    const token = res.json('token');
    sleep(0.5);

    // Get user profile with token
    if (token) {
        const profileRes = http.get(`${BASE_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        check(profileRes, {
            'Get profile - status 200': (r) => r.status === 200,
            'Get profile - user data exists': (r) => r.json('email') !== undefined,
        });
    }
    sleep(0.5);
}
export function paginateAndSelectProduct() {
    const endpoint = `${BASE_URL}/products`;

    // Make a request to fetch the first page of products
    const res = http.get(endpoint);

    // Log the response body for debugging
    //console.log(`Response body: ${res.body}`);

    check(res, {
        'Paginate products - status 200': (r) => r.status === 200,
        'Paginate products - valid JSON': (r) => {
            try {
                JSON.parse(r.body);
                return true;
            } catch (e) {
                //console.error('Error parsing JSON:', e);
                return false;
            }
        },
    });

    // Parse the JSON response
    if (res.status === 200) {
        try {
            const data = JSON.parse(res.body);
            // Select a random product from the response
            const selectedProduct = selectRandomElement(data);

            // Make a request to fetch details of the selected product
            const productDetailsRes = http.get(`${endpoint}/${selectedProduct.id}`);
            check(productDetailsRes, {
                'Product details - status 200': (r) => r.status === 200,
            });

            //console.log(`Selected product: ${selectedProduct.name}`);
        } catch (e) {
            //console.error('Error parsing JSON:', e);
        }
    }

    sleep(1); // Simulate a delay before the next iteration
}

export function filterAndSearchCategory() {
    const endpoint = `${BASE_URL}/categories`;

    // Fetch all categories
    const res = http.get(endpoint);
    check(res, {
        'Fetch categories - status 200': (r) => r.status === 200,
        'Fetch categories - list returned': (r) => r.json().length > 0,
    });
    const categories = res.json();
    sleep(0.5);

    // Randomly select a category and fetch products by category
    const category = selectRandomElement(categories);
    const categoryRes = http.get(`${BASE_URL}/categories/${category.id}/products`);
    check(categoryRes, {
        'Filter by category - status 200': (r) => r.status === 200,
        'Filter by category - products returned': (r) => r.json().length > 0,
    });
    sleep(0.5);
}