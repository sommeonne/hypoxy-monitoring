import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Table,
  Button,
  Tag,
  Spin,
  Typography,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Tabs,
  Empty,
} from "antd";
import {
  PlayCircleOutlined,
  ArrowRightOutlined,
  EditOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { fetchGroups } from "../api/groups";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPatient, updatePatient, deletePatient } from "../api/patients";
import { isAdmin } from "../utils/auth";
import { fetchPatientSessions, startSession, Session } from "../api/sessions";
import PatientInfoCard from "../components/PatientInfoCard";

const { Text } = Typography;

function PatientAvatar({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#E1F5EE",
        color: "#1D9E75",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [startForm] = Form.useForm();

  const { data: patient, isLoading: patLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => fetchPatient(id!),
    enabled: !!id,
  });

  const { data: sessions = [], isLoading: sessLoading } = useQuery({
    queryKey: ["patientSessions", id],
    queryFn: () => fetchPatientSessions(id!),
    enabled: !!id,
  });

  const { data: groupsData = [] } = useQuery({ queryKey: ['groups'], queryFn: fetchGroups });

  const editMutation = useMutation({
    mutationFn: (values: any) =>
      updatePatient(id!, {
        ...values,
        dateOfBirth: values.dateOfBirth.format("YYYY-MM-DD"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePatient(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate('/patients');
    },
  });

  const startMutation = useMutation({
    mutationFn: (values: { o2Percentage: number; durationMinutes: number; durationSeconds: number }) =>
      startSession({
        patientId: id!,
        o2Percentage: values.o2Percentage,
        plannedDurationSeconds: values.durationMinutes * 60 + values.durationSeconds,
      }),
    onSuccess: (session) => {
      setModalOpen(false);
      startForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["patientSessions", id] });
      navigate(`/sessions/${session.id}`);
    },
  });

  if (patLoading || sessLoading)
    return (
      <Spin size="large" style={{ display: "block", margin: "80px auto" }} />
    );
  if (!patient)
    return (
      <div style={{ padding: 32, color: "#64748B" }}>Patient not found</div>
    );

  const hasActiveSession = sessions.some((s) => s.status === "active");

  const sessionNotes = sessions
    .filter((s) => s.notes?.trim())
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

  const sessionColumns = [
    {
      title: <span className="label-caps">Started</span>,
      dataIndex: "startedAt",
      render: (d: string) => (
        <Text style={{ color: "#374151", fontSize: 13 }}>
          {new Date(d).toLocaleString()}
        </Text>
      ),
    },
    {
      title: <span className="label-caps">Ended</span>,
      dataIndex: "endedAt",
      render: (d: string) =>
        d ? (
          <Text style={{ color: "#374151", fontSize: 13 }}>
            {new Date(d).toLocaleString()}
          </Text>
        ) : (
          <Text style={{ color: "#CBD5E1" }}>—</Text>
        ),
    },
    {
      title: <span className="label-caps">Status</span>,
      dataIndex: "status",
      width: 100,
      render: (s: string) => (
        <Tag
          style={{
            background: s === "active" ? "#E1F5EE" : "#F1F5F9",
            color: s === "active" ? "#1D9E75" : "#64748B",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {s.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: <span className="label-caps">Duration</span>,
      width: 100,
      render: (_: any, s: Session) => (
        <Text style={{ color: "#64748B", fontSize: 13 }}>
          {s.summary ? `${s.summary.durationMinutes} min` : "—"}
        </Text>
      ),
    },
    {
      title: "",
      width: 80,
      render: (_: any, s: Session) => (
        <Button
          type="text"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate(`/sessions/${s.id}`)}
          style={{ color: "#1D9E75", fontWeight: 500 }}
        >
          View
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: "info",
      label: "Patient Info",
      children: (
        <PatientInfoCard
          cardNumber={patient.cardNumber}
          lastName={patient.lastName}
          firstName={patient.firstName}
          patronymic={patient.patronymic}
          dateOfBirth={patient.dateOfBirth}
          gender={patient.gender}
          group={patient.group?.number ?? null}
          height={patient.height ?? null}
          weight={patient.weight ?? null}
          phone={patient.phone}
          email={patient.email}
          address={patient.address}
          diagnosis={patient.diagnosis}
        />
      ),
    },
    {
      key: "sessions",
      label: `Sessions (${sessions.length})`,
      children: (
        <Card
          style={{
            borderRadius: 12,
            border: "1px solid #E2E8F0",
            boxShadow: "none",
          }}
          styles={{ body: { padding: 20 } }}
        >
          <Table
            dataSource={sessions}
            columns={sessionColumns}
            rowKey="id"
            pagination={{ pageSize: 10, size: "small" }}
            className="teal-table"
            onRow={(s) => ({
              onClick: () => navigate(`/sessions/${s.id}`),
              style: { cursor: "pointer" },
            })}
          />
        </Card>
      ),
    },
    {
      key: "notes",
      label: `Notes (${sessionNotes.length})`,
      children:
        sessionNotes.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No session notes yet"
            style={{ margin: "48px auto" }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessionNotes.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/sessions/${s.id}`)}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 12,
                  padding: "16px 20px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <FileTextOutlined
                    style={{ color: "#1D9E75", fontSize: 14 }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {new Date(s.startedAt).toLocaleString()}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "#111827",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {s.notes}
                </p>
              </div>
            ))}
          </div>
        ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <PatientAvatar
            firstName={patient.firstName}
            lastName={patient.lastName}
          />
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#0F172A",
                margin: "0 0 2px",
              }}
            >
              {patient.firstName} {patient.lastName}
            </h1>
            <Text style={{ color: "#64748B", fontSize: 13 }}>
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              {hasActiveSession && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#E1F5EE",
                    color: "#1D9E75",
                    borderRadius: 20,
                    padding: "1px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  Active
                </span>
              )}
            </Text>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {isAdmin() && (
            <Button
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              style={{ borderColor: '#E24B4A', color: '#E24B4A' }}
            >
              Delete
            </Button>
          )}
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              editForm.setFieldsValue({
                ...patient,
                dateOfBirth: dayjs(patient.dateOfBirth),
              });
              setEditOpen(true);
            }}
            style={{ fontWeight: 600 }}
          >
            Edit
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => setModalOpen(true)}
            disabled={hasActiveSession}
            style={{ fontWeight: 600 }}
          >
            Start Session
          </Button>
        </div>
      </div>

      <Modal
        title="Start Session"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); startForm.resetFields(); }}
        onOk={() =>
          startForm.validateFields().then((values) => startMutation.mutate(values))
        }
        okText="Start"
        confirmLoading={startMutation.isPending}
        okButtonProps={{ icon: <PlayCircleOutlined /> }}
        destroyOnClose
      >
        <Form form={startForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="O₂ Concentration (%)"
            name="o2Percentage"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 10, max: 20, message: "Must be between 10 and 20" },
            ]}
          >
            <InputNumber
              min={10}
              max={20}
              step={1}
              addonAfter="%"
              style={{ width: "100%" }}
              placeholder="10 – 20"
            />
          </Form.Item>
          <Form.Item label="Planned Duration">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Form.Item
                name="durationMinutes"
                initialValue={0}
                rules={[{ required: true, message: "Required" }]}
                style={{ marginBottom: 0, flex: 1 }}
              >
                <InputNumber min={0} max={999} addonAfter="min" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name="durationSeconds"
                initialValue={0}
                rules={[
                  { required: true, message: "Required" },
                  { type: "number", min: 0, max: 59, message: "0–59" },
                ]}
                style={{ marginBottom: 0, flex: 1 }}
              >
                <InputNumber min={0} max={59} addonAfter="sec" style={{ width: "100%" }} />
              </Form.Item>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>
            Edit Patient
          </span>
        }
        style={{ top: 20 }}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={editMutation.isPending}
        okText="Save"
        okButtonProps={{
          style: {
            background: "#1D9E75",
            borderColor: "#1D9E75",
            fontWeight: 600,
          },
        }}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ marginTop: 16 }}
          onFinish={(v) => editMutation.mutate(v)}
          requiredMark={false}
        >
          <Form.Item
            name="cardNumber"
            label={
              <span style={{ fontWeight: 500, fontSize: 13 }}>Card Number</span>
            }
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="lastName"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Last Name</span>
              }
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="firstName"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  First Name
                </span>
              }
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="patronymic"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  Patronymic
                </span>
              }
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="groupId"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Group</span>
              }
              rules={[{ required: true }]}
            >
              <Select>
                {groupsData.map((g) => (
                  <Select.Option key={g.id} value={g.id}>
                    {g.number}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="dateOfBirth"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  Date of Birth
                </span>
              }
              rules={[{ required: true }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="height"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  Height (cm)
                </span>
              }
              rules={[{ required: true }]}
            >
              <InputNumber style={{ width: "100%" }} min={0} max={300} />
            </Form.Item>
            <Form.Item
              name="weight"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  Weight (kg)
                </span>
              }
              rules={[{ required: true }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                max={500}
                step={0.1}
              />
            </Form.Item>
            <Form.Item
              name="gender"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Gender</span>
              }
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value="Male">Male</Select.Option>
                <Select.Option value="Female">Female</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item
            name="address"
            label={
              <span style={{ fontWeight: 500, fontSize: 13 }}>Address</span>
            }
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px",
            }}
          >
            <Form.Item
              name="phone"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Phone</span>
              }
              rules={[{ required: true }]}
            >
              <Input placeholder="+38(***) ***-**-**" />
            </Form.Item>
            <Form.Item
              name="email"
              label={
                <span style={{ fontWeight: 500, fontSize: 13 }}>Email</span>
              }
              rules={[
                { required: true },
                { type: "email", message: "Invalid email" },
              ]}
            >
              <Input placeholder="example@email.com" />
            </Form.Item>
          </div>
          <Form.Item
            name="diagnosis"
            label={
              <span style={{ fontWeight: 500, fontSize: 13 }}>Diagnosis</span>
            }
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Tabs defaultActiveKey="info" items={tabItems} style={{ marginTop: 4 }} />
    </div>
  );
}
