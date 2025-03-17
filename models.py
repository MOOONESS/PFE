from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Float
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from sqlalchemy.sql import func
from database import Base

class Citizen(Base):
    __tablename__ = "citizens"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(Text, nullable=False)
    complaints = relationship("Complaint", back_populates="citizen")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, nullable=False)
    citizen_id = Column(Integer, ForeignKey("citizens.id"))
    status = Column(String, default="pending")  # Ensure status field exists
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    assigned_truck_id = Column(Integer, ForeignKey("trucks.id"), nullable=True) 
    citizen = relationship("Citizen", back_populates="complaints")
    driver = relationship("Driver", back_populates="complaints")  
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True)  # New field
    assigned_truck = relationship("Truck", back_populates="complaints", foreign_keys=[assigned_truck_id])


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    password = Column(Text, nullable=False)
    truck = relationship("Truck", back_populates="driver", uselist=False)
    complaints = relationship("Complaint", back_populates="driver", foreign_keys="[Complaint.driver_id]")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    recipient = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())

class Truck(Base):
    __tablename__ = "trucks"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="CASCADE"), unique=True, nullable=False)
    status = Column(String(50), nullable=False, default="available")
    longitude = Column(Float, nullable=False)  # New longitude column
    latitude = Column(Float, nullable=False)  # New latitude column
    driver = relationship("Driver", back_populates="truck")
    complaints = relationship("Complaint", back_populates="assigned_truck")




class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    password = Column(Text, nullable=False)
