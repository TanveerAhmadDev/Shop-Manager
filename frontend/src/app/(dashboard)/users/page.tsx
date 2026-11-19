"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Users,
  UserRound,
  ShieldCheck,
  ShieldOff,
  Loader2,
  X,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

interface ShopUser {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "helper";
  is_active: boolean;
  created_at: string;
}

interface UsersResponse {
  success: boolean;
  message: string;
  data: ShopUser[];
}

interface CreateHelperResponse {
  success: boolean;
  message: string;
  data: ShopUser;
}

export default function UsersPage() {
  const [users, setUsers] = useState<ShopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  // Fetch all users belonging to the logged-in shop.
  const fetchUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiRequest<UsersResponse>("/users");

      setUsers(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Create a new helper account.
  const handleCreateHelper = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await apiRequest<CreateHelperResponse>(
        "/users/helpers",
        {
          method: "POST",
          body: JSON.stringify(form),
        },
      );

      setUsers((previous) => [...previous, response.data]);

      setForm({
        full_name: "",
        email: "",
        password: "",
      });

      setShowForm(false);
      setSuccess("Helper account created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create helper.");
    } finally {
      setSubmitting(false);
    }
  };

  // Activate or deactivate a helper account.
  const handleToggleStatus = async (user: ShopUser) => {
    const newStatus = !user.is_active;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        newStatus ? "activate" : "deactivate"
      } ${user.full_name}?`,
    );

    if (!confirmed) return;

    try {
      setUpdatingId(user.id);
      setError("");
      setSuccess("");

      await apiRequest(`/users/helpers/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: newStatus,
        }),
      });

      setUsers((previous) =>
        previous.map((item) =>
          item.id === user.id ? { ...item, is_active: newStatus } : item,
        ),
      );

      setSuccess(
        `${user.full_name} has been ${
          newStatus ? "activated" : "deactivated"
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setUpdatingId(null);
    }
  };

  const helpers = users.filter((user) => user.role === "helper");
  const activeHelpers = helpers.filter((user) => user.is_active);

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the people who can access your shop.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchUsers(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-card px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2A6A8B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#225773]"
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}
            {showForm ? "Close" : "Add Helper"}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Add helper form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Add New Helper
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create an account for someone who helps manage your shop.
          </p>

          <form onSubmit={handleCreateHelper} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  placeholder="Enter full name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="helper@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Create a password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#2A6A8B] focus:ring-2 focus:ring-[#2A6A8B]/10"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use at least 6 characters.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2A6A8B] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#225773] disabled:opacity-60"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Create Helper
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Users</p>
            <Users size={20} className="text-[#2A6A8B]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {loading ? "—" : users.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Helpers</p>
            <UserRound size={20} className="text-[#2A6A8B]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {loading ? "—" : helpers.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Active Helpers</p>
            <ShieldCheck size={20} className="text-green-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            {loading ? "—" : activeHelpers.length}
          </p>
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-card">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Shop Users</h2>
          <p className="mt-1 text-sm text-gray-500">
            All accounts connected to your shop.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="py-14 text-center">
            <Users size={32} className="mx-auto text-gray-300" />
            <p className="mt-3 font-medium text-gray-800">No users found</p>
            <p className="mt-1 text-sm text-gray-500">
              Add a helper to give someone access to your shop.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/70">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {user.full_name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {user.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.role === "owner"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.role === "owner" ? "Owner" : "Helper"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {user.role === "owner" ? (
                        <span className="text-xs text-gray-400">
                          Shop owner
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={updatingId === user.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50 ${
                            user.is_active
                              ? "border border-red-200 text-red-600 hover:bg-red-50"
                              : "border border-green-200 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {updatingId === user.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : user.is_active ? (
                            <ShieldOff size={14} />
                          ) : (
                            <ShieldCheck size={14} />
                          )}

                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
